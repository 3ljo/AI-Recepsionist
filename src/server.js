import express from "express";
import dotenv from "dotenv";
import { handleCall, endCall, getActiveCallCount } from "./ai-brain.js";
import { registerVapiRoutes } from "../vapi/webhook-handler.js";
import supabase from "./supabase.js";

dotenv.config();

const app = express();
app.use(express.json());

// Register Vapi webhook routes (/vapi/tool-call, /vapi/events)
registerVapiRoutes(app);

// ============================================================
// Demo business ID (from our seed data)
// In production, this comes from the phone number lookup
// ============================================================
const DEMO_BUSINESS_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ============================================================
// POST /chat — Send a message to the AI receptionist
// This is what Vapi/Twilio will call in Step 3
// For now, we test it manually
// ============================================================
app.post("/chat", async (req, res) => {
  try {
    const { message, call_id, business_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const callId = call_id || `test-${Date.now()}`;
    const businessId = business_id || DEMO_BUSINESS_ID;

    console.log(`\n👤 Caller says: "${message}"`);

    const aiResponse = await handleCall(businessId, callId, message);

    console.log(`\n🤖 AI says: "${aiResponse}"`);

    res.json({
      response: aiResponse,
      call_id: callId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /end-call — End a conversation and log it
// ============================================================
app.post("/end-call", async (req, res) => {
  try {
    const { call_id, business_id } = req.body;
    const businessId = business_id || DEMO_BUSINESS_ID;
    const history = endCall(call_id);

    // Save call log to database
    if (history && history.length > 0) {
      await supabase.from("call_logs").insert({
        business_id: businessId,
        transcript: history,
        outcome: "info_only",
        duration_seconds: null,
        summary: "Call completed via test interface",
      });
    }

    res.json({ success: true, message: "Call ended and logged" });
  } catch (error) {
    console.error("End call error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /status — Health check
// ============================================================
app.get("/status", (req, res) => {
  res.json({
    status: "running",
    active_calls: getActiveCallCount(),
    demo_business: DEMO_BUSINESS_ID,
  });
});

// ============================================================
// PATCH VAPI ASSISTANT — update system prompt with today's date on every startup
// ============================================================
async function syncVapiAssistantDate() {
  const VAPI_API_KEY = process.env.VAPI_API_KEY;
  const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || "2bc93cf4-d071-44fd-937c-e31063aaa1c2";

  if (!VAPI_API_KEY) return;

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const systemPrompt = `You are a warm, efficient receptionist for Grand Hotel Demo. You are on a phone call — be brief and natural.

TODAY: ${today} | TOMORROW: ${tomorrow}

ROOMS:
- Room 101: City view, queen, 2 guests, $89/night
- Room 102: Garden view, queen, 2 guests, $89/night
- Suite 201: Balcony, king, 3 guests, $159/night
- Suite 202: Corner/panoramic, king, 3 guests, $179/night
- Presidential: Top floor, 2 beds, jacuzzi, 5 guests, $349/night

RULES:
1. Max 1-2 short sentences per response. Never over-explain.
2. Always check availability with tools before booking — never guess.
3. If unavailable, immediately use find_next_available.
4. Get the guest's name before confirming any booking.
5. After booking, confirm: room name, dates in natural language, total price. Nothing else.

HOW TO SPEAK (CRITICAL):
- Dates: always say them naturally — "March 27th", "tomorrow", "next Friday". NEVER read out YYYY-MM-DD.
- Confirmation numbers: NEVER read them out. Just say "You're all set!" or "Booking confirmed!"
- IDs, UUIDs, codes: NEVER speak these aloud under any circumstances.
- Numbers: say "89 dollars a night", not "$89/night".
- Keep it conversational — one breath, done.

DATE HANDLING:
- You know today and tomorrow — never ask the caller for the date.
- Resolve "tomorrow", "tonight", "next week" yourself and call the tool silently.`;

  try {
    const res = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
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
    });
    if (res.ok) {
      console.log(`   ✅ Vapi assistant date synced: ${today}`);
    } else {
      console.warn(`   ⚠️  Vapi sync failed: ${res.status}`);
    }
  } catch (err) {
    console.warn(`   ⚠️  Vapi sync error: ${err.message}`);
  }
}

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await syncVapiAssistantDate();
  console.log(`
╔══════════════════════════════════════════════╗
║     🤖 AI RECEPTIONIST BRAIN — ONLINE       ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Server:  http://localhost:${PORT}              ║
║  Status:  http://localhost:${PORT}/status        ║
║                                              ║
║  Vapi webhook:                               ║
║  POST http://localhost:${PORT}/vapi/tool-call    ║
║  POST http://localhost:${PORT}/vapi/events       ║
║                                              ║
║  Text test:                                  ║
║  POST http://localhost:${PORT}/chat              ║
║                                              ║
╚══════════════════════════════════════════════╝
  `);
});
