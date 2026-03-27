import express from "express";
import cors from "cors";
import helmet from "helmet";
import config from "./config.js";
import {
  handleCall,
  endCall,
  getActiveCallCount,
  getLastClaudeSuccess,
  loadActiveConversations,
} from "./ai-brain.js";
import { registerVapiRoutes } from "../vapi/webhook-handler.js";
import supabase from "./supabase.js";
import logger, { requestIdMiddleware } from "./logger.js";
import { apiKeyAuth } from "./middleware/auth.js";
import { validateChat, validateEndCall } from "./middleware/validate.js";
import { chatRateLimit, statusRateLimit } from "./middleware/rate-limit.js";
import {
  globalErrorHandler,
  registerProcessHandlers,
} from "./middleware/error-handler.js";
import { getQueueDepth } from "./queue.js";
import { metricsMiddleware, getMetricsSummary } from "./metrics.js";
import { analyzeCall } from "./analytics.js";
import { auditLog } from "./audit.js";

// Register process-level error handlers
registerProcessHandlers();

const app = express();
const startTime = Date.now();

// ============================================================
// Security middleware
// ============================================================
app.use(helmet());
app.disable("x-powered-by");
app.use(
  cors({
    origin: config.allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-api-key"],
  })
);
app.use(express.json());
app.use(requestIdMiddleware);
app.use(metricsMiddleware);

// ============================================================
// Register Vapi webhook routes (/vapi/tool-call, /vapi/events)
// These have their own auth (signature verification) and rate limiting
// ============================================================
registerVapiRoutes(app);

// ============================================================
// Demo business ID (from our seed data)
// In production, this comes from the phone number lookup
// ============================================================
const DEMO_BUSINESS_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ============================================================
// POST /chat — Send a message to the AI receptionist
// ============================================================
app.post(
  "/chat",
  chatRateLimit(config.rateLimitChat),
  // apiKeyAuth, // disabled for testing
  validateChat,
  async (req, res, next) => {
    try {
      const { message, call_id, business_id } = req.body;

      const callId = call_id || `test-${Date.now()}`;
      const businessId = business_id || DEMO_BUSINESS_ID;

      logger.info("Chat message received", {
        callId,
        businessId,
        requestId: req.requestId,
      });

      const aiResponse = await handleCall(businessId, callId, message);

      logger.info("Chat response sent", {
        callId,
        requestId: req.requestId,
      });

      res.json({
        response: aiResponse,
        call_id: callId,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// POST /end-call — End a conversation and log it
// ============================================================
app.post(
  "/end-call",
  chatRateLimit(config.rateLimitChat),
  // apiKeyAuth, // disabled for testing
  validateEndCall,
  async (req, res, next) => {
    try {
      const { call_id, business_id } = req.body;
      const businessId = business_id || DEMO_BUSINESS_ID;
      const { history, meta } = endCall(call_id);

      // Save call log to database
      if (history && history.length > 0) {
        // Run analytics on the completed call
        const analytics = await analyzeCall(
          businessId,
          call_id,
          history,
          meta?.startTime
        );

        await supabase.from("call_logs").insert({
          business_id: businessId,
          transcript: history,
          outcome: analytics?.outcome || "info_only",
          duration_seconds: analytics?.duration_seconds || null,
          summary: "Call completed",
        });

        await auditLog("call_ended", {
          businessId,
          callId: call_id,
          outcome: analytics?.outcome,
          turnCount: analytics?.turn_count,
        });
      }

      res.json({ success: true, message: "Call ended and logged" });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// GET /status — Enhanced health check (no auth required)
// ============================================================
let cachedHealth = null;
let healthCacheTime = 0;
const HEALTH_CACHE_MS = 30000;

app.get("/status", statusRateLimit(120), async (req, res) => {
  const now = Date.now();

  // Return cached result if fresh
  if (cachedHealth && now - healthCacheTime < HEALTH_CACHE_MS) {
    return res.json(cachedHealth);
  }

  // Check Supabase connectivity
  let supabaseStatus = { status: "unknown" };
  try {
    const start = Date.now();
    const { error } = await supabase
      .from("businesses")
      .select("id")
      .limit(1);
    const latency = Date.now() - start;
    supabaseStatus = error
      ? { status: "error", error: error.message }
      : { status: "connected", latency_ms: latency };
  } catch (err) {
    supabaseStatus = { status: "disconnected", error: err.message };
  }

  // Anthropic status (based on last successful call)
  const lastSuccess = getLastClaudeSuccess();
  const anthropicStatus = {
    status: lastSuccess ? "connected" : "unknown",
    last_success: lastSuccess,
  };

  // Vapi status
  const vapiStatus = {
    status: config.vapiApiKey ? "configured" : "not_configured",
  };

  // Overall status
  const isHealthy = supabaseStatus.status === "connected";

  const metricsSummary = getMetricsSummary();
  const totalCallsToday = Object.values(metricsSummary.routes).reduce(
    (sum, r) => sum + r.request_count,
    0
  );
  const routeEntries = Object.values(metricsSummary.routes);
  const avgResponseTime =
    routeEntries.length > 0
      ? Math.round(
          routeEntries.reduce((sum, r) => sum + r.avg_latency_ms, 0) /
            routeEntries.length
        )
      : 0;
  const totalErrors = routeEntries.reduce((sum, r) => sum + r.error_count, 0);
  const errorRate =
    totalCallsToday > 0
      ? +((totalErrors / totalCallsToday) * 100).toFixed(1)
      : 0;

  cachedHealth = {
    status: isHealthy ? "healthy" : "degraded",
    version: "1.0.0",
    uptime_seconds: Math.floor((now - startTime) / 1000),
    active_calls: getActiveCallCount(),
    queue_depth: getQueueDepth(),
    services: {
      supabase: supabaseStatus,
      anthropic: anthropicStatus,
      vapi: vapiStatus,
    },
    metrics: {
      total_requests_today: totalCallsToday,
      avg_response_time_ms: avgResponseTime,
      error_rate_pct: errorRate,
    },
  };
  healthCacheTime = now;

  res.json(cachedHealth);
});

// ============================================================
// GET /metrics — Detailed metrics (protected)
// ============================================================
app.get("/metrics", /* apiKeyAuth, */ (req, res) => {
  res.json(getMetricsSummary());
});

// ============================================================
// Global error handler (must be registered last)
// ============================================================
app.use(globalErrorHandler);

// ============================================================
// PATCH VAPI ASSISTANT — update system prompt with today's date on every startup
// ============================================================
async function syncVapiAssistantDate() {
  const VAPI_API_KEY = config.vapiApiKey;
  const ASSISTANT_ID =
    config.vapiAssistantId || "2bc93cf4-d071-44fd-937c-e31063aaa1c2";

  if (!VAPI_API_KEY) return;

  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().toLocaleDateString("en-US", {
    weekday: "long",
  });
  const tomorrow = new Date(Date.now() + 86400000)
    .toISOString()
    .split("T")[0];
  const tomorrowDay = new Date(Date.now() + 86400000).toLocaleDateString(
    "en-US",
    { weekday: "long" }
  );

  const systemPrompt = `You are the front desk receptionist at Grand Hotel Demo. You answer phone calls with the poise and warmth of a five-star concierge — calm, confident, and genuinely helpful.

TODAY: ${dayOfWeek}, ${today} | TOMORROW: ${tomorrowDay}, ${tomorrow}

ROOMS:
- Standard Room 101: City view, queen bed, up to 2 guests, 89 dollars per night
- Standard Room 102: Garden view, queen bed, up to 2 guests, 89 dollars per night
- Deluxe Suite 201: Balcony, king bed, living area, up to 3 guests, 159 dollars per night
- Deluxe Suite 202: Corner suite, panoramic view, king bed, up to 3 guests, 179 dollars per night
- Presidential Suite: Top floor, 2 bedrooms, jacuzzi, full kitchen, up to 5 guests, 349 dollars per night

============================
VOICE & TONE
============================
- You sound like a real human who loves their job — warm, calm, professional.
- Lead with the answer: "Yes, we have availability!" before the details.
- Max 1-2 sentences per response. Callers are listening, not reading.
- Mirror the caller's energy — hurried caller gets efficient answers, relaxed caller gets warmer tone.
- Before checking tools, say something natural: "One moment, let me check." / "Sure, let me look that up."
- After good news: "Great news!" / "Perfect." — After bad news: "Unfortunately..." then immediately offer an alternative.
- NEVER say "As an AI" or mention being artificial. You are the receptionist. Period.
- NEVER say "Based on my records" — just state the fact directly.

============================
SPEAKING RULES (CRITICAL)
============================
DATES: Say "this Friday, March 28th" or "tomorrow" — NEVER "2026-03-28".
PRICES: Say "eighty-nine dollars a night" — NEVER "$89/night". Say "that's one seventy-eight for two nights."
IDs & CODES: NEVER read booking IDs, UUIDs, or confirmation codes. Say "You're all set!" or "Your reservation is confirmed."
NAMES: Use the caller's name once after learning it, then sparingly. Not every sentence.
RESOLVE DATES: "tomorrow", "tonight", "this weekend", "next Friday" — figure it out silently. Never ask the caller to specify a date you can calculate.

============================
BOOKING FLOW
============================
1. Caller asks about a room -> "Let me check that for you." -> use check_availability
2. Available -> Present the best option: "Great news! I have our [Room] available — [brief highlight], [price] per night."
3. Ask for name: "Wonderful. And may I have your name for the reservation?"
4. Confirm in one breath: "[Name], I've got you in [Room] for [dates], [total price]. Shall I confirm?"
5. After booking: "You're all set! Is there anything else I can help with?"

If unavailable -> "Those dates are booked, but let me check nearby..." -> use find_next_available -> offer the closest option.
If nothing in 30 days -> "We're fully booked for the next month, I'm sorry. Would you like me to keep your details in case something opens up?"

============================
DIFFICULT MOMENTS
============================
- Frustrated caller: "I completely understand, and I'm sorry. Let me sort this out for you right now."
- Confused caller: Simplify. One question at a time. "No problem. Let's start with — what dates were you thinking?"
- Wants a human: "Of course, let me transfer you right now." No pushback.
- Off-topic question: Answer if you can. If not: "Great question — let me connect you with someone who can help."

============================
HARD RULES
============================
1. ALWAYS use tools to check availability. Never guess or assume.
2. ALWAYS offer alternatives when dates are booked. Never just say "unavailable."
3. ALWAYS get the guest's name before booking.
4. NEVER fabricate rooms, prices, or availability.
5. After booking: confirm name, room, dates (natural language), total price.
6. Every word you write will be spoken aloud on a phone call. Write like you talk.`;

  try {
    const res = await fetch(
      `https://api.vapi.ai/assistant/${ASSISTANT_ID}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: {
            provider: "anthropic",
            model: "claude-sonnet-4-20250514",
            messages: [{ role: "system", content: systemPrompt }],
          },
        }),
      }
    );
    if (res.ok) {
      logger.info("Vapi assistant date synced", { date: today });
    } else {
      logger.warn("Vapi sync failed", { status: res.status });
    }
  } catch (err) {
    logger.warn("Vapi sync error", { error: err.message });
  }
}

// ============================================================
// Supabase health check on startup
// ============================================================
async function checkSupabaseConnection() {
  try {
    const { error } = await supabase.from("businesses").select("id").limit(1);
    if (error) {
      logger.error("Supabase connection check failed", {
        error: error.message,
      });
      return false;
    }
    logger.info("Supabase connection verified");
    return true;
  } catch (err) {
    logger.error("Supabase unreachable", { error: err.message });
    return false;
  }
}

// ============================================================
// START SERVER
// ============================================================
const PORT = config.port;
app.listen(PORT, async () => {
  await checkSupabaseConnection();
  await loadActiveConversations();
  await syncVapiAssistantDate();

  logger.info("Server started", { port: PORT, env: config.nodeEnv });

  console.log(`
======================================================
     AI RECEPTIONIST BRAIN — ONLINE
======================================================

  Server:  http://localhost:${PORT}
  Status:  http://localhost:${PORT}/status
  Metrics: http://localhost:${PORT}/metrics

  Vapi webhook:
  POST http://localhost:${PORT}/vapi/tool-call
  POST http://localhost:${PORT}/vapi/events

  Text test:
  POST http://localhost:${PORT}/chat

======================================================
  `);
});
