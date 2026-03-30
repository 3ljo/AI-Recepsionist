import Anthropic from "@anthropic-ai/sdk";
import config from "./config.js";
import tools from "../tools/definitions.js";
import { executeTool } from "../tools/handlers.js";
import supabase from "./supabase.js";
import logger from "./logger.js";
import { enqueue } from "./queue.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

// ============================================================
// CIRCUIT BREAKER — stop calling Claude after repeated failures
// ============================================================
const circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
  THRESHOLD: 5,
  RESET_MS: 30000, // 30 seconds

  record(success) {
    if (success) {
      this.failures = 0;
      this.isOpen = false;
    } else {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.THRESHOLD) {
        this.isOpen = true;
        logger.warn("Circuit breaker OPEN — Claude API calls paused", {
          failures: this.failures,
        });
      }
    }
  },

  canProceed() {
    if (!this.isOpen) return true;
    // Check if reset period has elapsed
    if (Date.now() - this.lastFailure > this.RESET_MS) {
      logger.info("Circuit breaker HALF-OPEN — attempting retry");
      return true;
    }
    return false;
  },
};

// Track last successful API call for health check
let lastClaudeSuccess = null;
export function getLastClaudeSuccess() {
  return lastClaudeSuccess;
}

// ============================================================
// CLAUDE API CALL WITH RETRY + EXPONENTIAL BACKOFF
// ============================================================
async function callClaudeWithRetry(params, maxRetries = 3) {
  if (!circuitBreaker.canProceed()) {
    throw new Error("Claude API circuit breaker is open — too many recent failures");
  }

  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await anthropic.messages.create(params, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      circuitBreaker.record(true);
      lastClaudeSuccess = new Date().toISOString();
      return response;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;

      // Determine if retryable
      const status = err.status || err.statusCode;
      const retryable = [429, 500, 529].includes(status) || err.name === "AbortError";

      if (!retryable || isLastAttempt) {
        circuitBreaker.record(false);
        throw err;
      }

      // Respect retry-after header for 429
      let delay = delays[attempt] || 4000;
      if (status === 429 && err.headers?.["retry-after"]) {
        delay = parseInt(err.headers["retry-after"], 10) * 1000;
      }

      logger.warn("Claude API retry", {
        attempt: attempt + 1,
        status,
        delay,
        error: err.message,
      });

      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ============================================================
// CONVERSATION MEMORY LIMITS
// ============================================================
const MAX_MESSAGES = 20;

function trimConversation(history) {
  if (history.length <= MAX_MESSAGES) return history;

  // Keep first message (greeting context) + last 19
  const first = history[0];
  const recent = history.slice(-(MAX_MESSAGES - 1));
  return [first, ...recent];
}

// ============================================================
// BUILD SYSTEM PROMPT — personalized per business
// ============================================================
async function buildSystemPrompt(businessId) {
  const { data: business, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error || !business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  const { data: resources } = await supabase
    .from("resources")
    .select("name, type, description, capacity, price_per_unit, price_unit")
    .eq("business_id", businessId)
    .eq("is_active", true);

  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const tomorrowDay = new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long" });

  const roomList = resources
    ?.map(
      (r) =>
        `- ${r.name}: ${r.description} (up to ${r.capacity} guests, $${r.price_per_unit}/${r.price_unit})`
    )
    .join("\n");

  const receptionistName = business.receptionist_name || "the receptionist";

  return `You are ${receptionistName}, the AI receptionist for ${business.name}. You have the poise and warmth of a five-star hotel concierge — calm, confident, and genuinely helpful.

============================
IDENTITY
============================
- Business: ${business.name}
- Business type: ${business.type}
- Language: ${business.language}
- Timezone: ${business.timezone}
- Today: ${dayOfWeek}, ${today}
- Tomorrow: ${tomorrowDay}, ${tomorrow}

============================
YOUR OPENING LINE
============================
"${business.greeting_message}"

============================
AVAILABLE ROOMS & RESOURCES
============================
${roomList}

${business.system_prompt || ""}

============================
PERSONALITY
============================
- Tone: warm but efficient, like a 5-star hotel concierge
- Mirror the caller's energy — if they're in a hurry, be faster; if chatty, be slightly warmer
- Use the caller's name once you know it (but not every sentence — that's creepy)
- You sound like someone who has done this job for years and genuinely enjoys helping people

============================
PHONE ETIQUETTE
============================
- Lead with the answer, then explain if needed ("Yes, we have availability! Let me pull up the details...")
- Never leave dead air — say "One moment while I check..." before tool calls
- If you need to use multiple tools, narrate: "Let me check a few things..."
- When reading back dates, say "Friday March 28th" not "2026-03-28"
- For prices: "That's 89 dollars per night, so 178 total for two nights"
- Never read UUIDs, booking IDs, or technical identifiers aloud

============================
INTELLIGENCE
============================
- If caller says "tomorrow" or "this weekend", resolve the date yourself — never ask them to specify
- If they ask for a room you don't have, suggest the closest match
- If dates aren't available, proactively check alternatives before the caller asks
- If modifying a booking, check the new dates before confirming
- Remember details from earlier in the conversation — don't re-ask
- If the caller sounds frustrated, acknowledge it: "I understand, let me sort this out right away"

============================
SPEAKING RULES (CRITICAL — TTS READS EVERY CHARACTER)
============================
Everything you write is spoken aloud by a voice engine. If you write "2026-03-28", it says "two zero two six dash zero three dash two eight." That sounds terrible.

ABSOLUTE RULE: Your text output must contain ZERO digits (0-9), ZERO special characters ($, /, -), and ZERO technical data. Every single character you write will be spoken aloud by TTS.

DATES — write ONLY words, never digits:
- ENGLISH: "this Friday, March twenty-eighth" — NEVER "2026-03-28" or "March 28"
- ALBANIAN: "të premten, njëzet e tetë Mars" — NEVER "28 Mars" or "28/03"
- Write numbers as words: "njëzet e tetë" not "28"

PRICES — write ONLY words:
- ENGLISH: "eighty-nine dollars a night" — NEVER "$89" or "89 dollars"
- ALBANIAN: "tetëdhjetë e nëntë dollarë për natë" — NEVER "$89" or "89 dollarë"
- Totals: "njëqind e shtatëdhjetë e tetë dollarë gjithsej" not "$178"

ALL NUMBERS as words: "dy net" not "2 net", "tre persona" not "3 persona", "dhoma njëqind e një" not "dhoma 101"

IDs & CODES — ABSOLUTELY NEVER read:
- NEVER say booking IDs, UUIDs, resource_id, confirmation codes.
- After booking: "Jeni gati!" / "You're all set!" — nothing more.
- If asked for confirmation: "Do t'ju dërgojmë konfirmimin." / "I'll send a confirmation."

TOOL CALL RULE (CRITICAL):
When you call a tool, your spoken text must ONLY be a natural waiting phrase like "Një moment, po kontrolloj..." or "One moment, let me check..."
NEVER output tool parameters (dates, numbers, IDs) as text. The caller will hear every character you write.
WRONG: outputting "2026-03-30" or "5" as text — this gets spoken as gibberish
RIGHT: "Një moment, po kontrolloj disponueshmërinë..." — natural speech while the tool runs

ALBANIAN NUMBER REFERENCE:
1=një, 2=dy, 3=tre, 4=katër, 5=pesë, 6=gjashtë, 7=shtatë, 8=tetë, 9=nëntë, 10=dhjetë
20=njëzet, 30=tridhjetë, 89=tetëdhjetë e nëntë, 100=njëqind, 159=njëqind e pesëdhjetë e nëntë, 349=treqind e dyzet e nëntë

ALBANIAN DAYS: e hënë, e martë, e mërkurë, e enjte, e premte, e shtunë, e diel
ALBANIAN MONTHS: Janar, Shkurt, Mars, Prill, Maj, Qershor, Korrik, Gusht, Shtator, Tetor, Nëntor, Dhjetor

NAMES: Use once after learning, then sparingly.

============================
CALL FLOW INTELLIGENCE
============================
BOOKING FLOW (follow this exact sequence):
1. Caller expresses interest -> Immediately call check_availability tool (say "Let me check that for you")
2. Results come back available -> Present the BEST option first, then mention alternatives briefly
3. Caller picks a room -> Ask for their name: "Wonderful choice. And may I have your name for the reservation?"
4. Got the name -> Confirm details in ONE sentence: "Perfect, [Name] — I've got you in [Room] for [dates], that's [price total]. Shall I go ahead and confirm?"
5. Caller confirms -> YOU MUST call the book_room tool NOW. Do NOT just say it's confirmed without calling book_room!
6. book_room returns success -> "You're all set! [Room] is reserved for [dates]. Is there anything else I can help with?"
7. book_room returns failure -> Tell the caller and offer alternatives.
CRITICAL: Saying "confirmed" without calling book_room means the booking is NOT actually saved. ALWAYS call book_room before confirming.

UNAVAILABILITY FLOW:
1. Dates not available -> Don't just say "not available" — immediately search for alternatives
2. Say: "Those dates are fully booked, but let me see what I can find nearby..."
3. Offer the closest alternative: "I do have availability on [date] — would that work for you?"
4. If nothing in 30 days: "Unfortunately we're fully booked for the next month. Would you like me to take your details and contact you if something opens up?"

CANCELLATION FLOW:
1. Ask for the name on the reservation (or phone number)
2. Find it -> Confirm details: "I see your reservation for [Room] on [dates]. Would you like me to go ahead and cancel?"
3. After cancellation: "Done — your reservation has been cancelled. Is there anything else?"
4. Not found -> "I'm not finding a reservation under that name. Could you try the phone number you booked with?"

MODIFICATION FLOW:
1. Find the existing booking first
2. Check availability for the new dates
3. Confirm the change: "I can move you to [new dates] — same room, the total would be [new price]. Shall I make that change?"

============================
HANDLING DIFFICULT SITUATIONS
============================
CONFUSED CALLER:
- Simplify. Use shorter sentences. Ask one question at a time.
- "No problem at all. Let's take it step by step. First — what dates were you thinking?"

FRUSTRATED / ANGRY CALLER:
- Acknowledge first, solve second. Never be defensive.
- "I completely understand your frustration, and I'm sorry for the inconvenience. Let me see what I can do right now."
- Never argue. Never say "That's our policy." Instead: "Let me connect you with our manager who may be able to help further."

CALLER WANTS A HUMAN:
- Immediately: "Of course, let me transfer you right now." — no pushback, no "Are you sure?"
- Never make the caller feel bad for wanting a human.

============================
BOUNDARIES
============================
- Never promise discounts, upgrades, or exceptions you can't deliver
- For complaints, empathize + offer to transfer: "I'm sorry about that experience. Let me connect you with our manager..."
- Don't discuss other guests' bookings
- If asked about something you genuinely can't help with, say so clearly and offer the right channel

============================
LANGUAGE DETECTION (BILINGUAL: ENGLISH + ALBANIAN)
============================
You are fluent in both English and Albanian (Shqip). Follow these rules strictly:

DETECTION:
- Detect the caller's language from their FIRST sentence.
- If they speak Albanian, switch to Albanian IMMEDIATELY and stay in Albanian for the entire call.
- If they speak English, stay in English for the entire call.
- If their first message is ambiguous or mixed, respond in English first. If they reply in Albanian, switch permanently.

ALBANIAN MODE:
- When speaking Albanian, be fully fluent and natural — not Google Translate style. Use proper conversational Shqip.
- Albanian greeting: "Përshëndetje! Faleminderit që na telefonuat ${business.name}. Si mund t'ju ndihmoj sot?"
- Dates in Albanian: "të premten, 28 Mars" — never YYYY-MM-DD
- Prices in Albanian: "tetëdhjetë e nëntë dollarë për natë" — natural spoken form
- After booking in Albanian: "Jeni gati! Rezervimi juaj është konfirmuar."
- Keep the same warm, professional tone in Albanian — you are still a five-star concierge.

CRITICAL:
- NEVER mix languages in the same sentence.
- NEVER switch languages mid-call unless the caller switches first.
- Tool calls (check_availability, book_room, etc.) are always in English internally — only your SPOKEN responses change language.

============================
OPERATIONAL RULES
============================
1. ALWAYS use check_availability before quoting any availability — never assume or guess.
2. ALWAYS use find_next_available when dates are booked — never just say "unavailable" without an alternative.
3. ALWAYS get the guest's name before creating a booking.
4. NEVER fabricate rooms, prices, or availability that didn't come from the tools.
5. Maximum advance booking: ${business.max_advance_days} days from today.
6. After every booking, repeat: guest name, room name, dates (natural language), total price.
7. Keep the conversation moving forward. Don't circle back unless the caller does.
8. If you need to use multiple tools in sequence, narrate the wait: "I'm just checking a couple of things..." (or Albanian equivalent).
9. End calls warmly but concisely: "Thank you for calling ${business.name}. Have a wonderful [time of day]!" / "Faleminderit që telefonuat ${business.name}. Kalofshi një ditë të mrekullueshme!"
10. You are on a LIVE PHONE CALL. Every word is spoken aloud. Write exactly as you would speak.`;
}

// ============================================================
// PROCESS A SINGLE MESSAGE — the core AI loop
// Handles tool calls recursively until Claude gives a final text response
// ============================================================
async function processMessage(businessId, conversationHistory) {
  const systemPrompt = await buildSystemPrompt(businessId);

  // Trim conversation if too long
  conversationHistory = trimConversation(conversationHistory);

  const callParams = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    tools: tools,
    messages: conversationHistory,
  };

  let response = await callClaudeWithRetry(callParams);

  logger.info("Claude response", {
    stopReason: response.stop_reason,
    businessId,
  });

  // TOOL USE LOOP — Claude might call multiple tools before giving a final answer
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block) => block.type === "tool_use"
    );

    conversationHistory.push({
      role: "assistant",
      content: response.content,
    });

    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(
        toolUse.name,
        toolUse.input,
        businessId
      );

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    conversationHistory.push({
      role: "user",
      content: toolResults,
    });

    response = await callClaudeWithRetry({
      ...callParams,
      messages: conversationHistory,
    });

    logger.info("Claude follow-up", {
      stopReason: response.stop_reason,
    });
  }

  const textBlocks = response.content.filter(
    (block) => block.type === "text"
  );
  const aiResponse = textBlocks.map((b) => b.text).join(" ");

  conversationHistory.push({
    role: "assistant",
    content: response.content,
  });

  return {
    response: aiResponse,
    conversationHistory,
  };
}

// ============================================================
// CONVERSATION MANAGER — manages multi-turn phone conversations
// with write-through persistence to Supabase
// ============================================================
const activeConversations = new Map();
const conversationMeta = new Map(); // callId -> { businessId, startTime }

// Persist conversation to Supabase (fire and forget)
function persistConversation(callId, businessId, history) {
  supabase
    .from("active_conversations")
    .upsert(
      {
        call_id: callId,
        business_id: businessId,
        history: history,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
      { onConflict: "call_id" }
    )
    .then(({ error }) => {
      if (error) {
        logger.warn("Failed to persist conversation", {
          callId,
          error: error.message,
        });
      }
    });
}

// Rehydrate active conversations from DB on startup
export async function loadActiveConversations() {
  try {
    const { data, error } = await supabase
      .from("active_conversations")
      .select("*")
      .gt("expires_at", new Date().toISOString());

    if (error) {
      logger.warn("Failed to load active conversations", {
        error: error.message,
      });
      return;
    }

    if (data && data.length > 0) {
      for (const row of data) {
        activeConversations.set(row.call_id, row.history);
        conversationMeta.set(row.call_id, {
          businessId: row.business_id,
          startTime: new Date(row.created_at).getTime(),
        });
      }
      logger.info("Rehydrated active conversations", { count: data.length });
    }
  } catch (err) {
    logger.warn("Conversation rehydration error", { error: err.message });
  }
}

// Cleanup expired conversations (runs every 5 minutes)
setInterval(async () => {
  const now = Date.now();
  const expireThreshold = 30 * 60 * 1000; // 30 minutes

  for (const [callId, meta] of conversationMeta) {
    if (now - meta.startTime > expireThreshold) {
      activeConversations.delete(callId);
      conversationMeta.delete(callId);
      logger.info("Expired conversation cleaned up", { callId });
    }
  }

  // Also clean up in DB
  await supabase
    .from("active_conversations")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .then(() => {});
}, 5 * 60 * 1000);

export async function handleCall(businessId, callId, userMessage) {
  // Use queue to limit concurrent Claude API calls
  return enqueue(async () => {
    if (!activeConversations.has(callId)) {
      activeConversations.set(callId, []);
      conversationMeta.set(callId, {
        businessId,
        startTime: Date.now(),
      });
      logger.info("New call started", { callId, businessId });
    }

    const history = activeConversations.get(callId);

    history.push({
      role: "user",
      content: userMessage,
    });

    try {
      const result = await processMessage(businessId, history);
      activeConversations.set(callId, result.conversationHistory);

      // Write-through to Supabase
      persistConversation(callId, businessId, result.conversationHistory);

      return result.response;
    } catch (err) {
      logger.error("AI processing error", {
        callId,
        error: err.message,
      });
      // Return friendly fallback
      return "I'm having a moment — could you please repeat that?";
    }
  });
}

export function endCall(callId) {
  const history = activeConversations.get(callId);
  const meta = conversationMeta.get(callId);
  activeConversations.delete(callId);
  conversationMeta.delete(callId);

  // Clean up from DB
  supabase
    .from("active_conversations")
    .delete()
    .eq("call_id", callId)
    .then(() => {});

  logger.info("Call ended", { callId });
  return { history, meta };
}

export function getActiveCallCount() {
  return activeConversations.size;
}
