import dotenv from "dotenv";
dotenv.config();

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || "https://ai-recepsionist.onrender.com";
const TOOL_SERVER_URL = `${SERVER_URL}/vapi/tool-call`;

if (!VAPI_API_KEY || !ASSISTANT_ID) {
  console.error("Missing VAPI_API_KEY or VAPI_ASSISTANT_ID in .env");
  process.exit(1);
}

const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

// ============================================================
// TOOL DEFINITIONS — each tool has its own server.url
// This ensures Vapi sends "function-call" format to our webhook
// ============================================================
function makeTool(name, description, parameters, required) {
  return {
    type: "function",
    function: { name, description, parameters: { type: "object", properties: parameters, required } },
    server: { url: TOOL_SERVER_URL },
  };
}

const tools = [
  makeTool("check_availability", "Check room availability for dates. ALWAYS call this first.", {
    check_in: { type: "string", description: "YYYY-MM-DD" },
    check_out: { type: "string", description: "YYYY-MM-DD" },
    guest_count: { type: "number", description: "Number of guests" },
  }, ["check_in"]),
  makeTool("find_next_available", "Find next available date when requested dates are full.", {
    from_date: { type: "string", description: "YYYY-MM-DD" },
    guest_count: { type: "number", description: "Number of guests" },
  }, ["from_date"]),
  makeTool("book_room", "Create a real booking. MUST call this when caller confirms — without this, NO booking is saved.", {
    resource_id: { type: "string", description: "Room UUID from check_availability" },
    check_in: { type: "string", description: "YYYY-MM-DD" },
    check_out: { type: "string", description: "YYYY-MM-DD" },
    guest_name: { type: "string", description: "Guest full name" },
    guest_phone: { type: "string", description: "Guest phone number" },
    guest_count: { type: "number", description: "Number of guests" },
    notes: { type: "string", description: "Special requests" },
  }, ["resource_id", "check_in", "check_out", "guest_name"]),
  makeTool("cancel_booking", "Cancel a booking by guest name or phone.", {
    guest_name: { type: "string", description: "Guest name" },
    guest_phone: { type: "string", description: "Guest phone" },
  }, []),
  makeTool("get_business_info", "Get hotel info for guest questions.", {
    question_type: { type: "string", enum: ["amenities", "policies", "directions", "contact", "hours", "parking", "dining"], description: "Info type" },
  }, ["question_type"]),
  makeTool("transfer_to_human", "Transfer to human staff.", {
    reason: { type: "string", description: "Transfer reason" },
    priority: { type: "string", enum: ["normal", "urgent"], description: "Priority" },
  }, ["reason"]),
];

// ============================================================
// SYSTEM PROMPT — empathetic, human, short, no technical data
// ============================================================
const systemPrompt = `You are the front desk receptionist at Grand Hotel Demo. You answer phone calls with the poise and warmth of a five-star concierge — calm, confident, and genuinely helpful.

Today: ${today}
Tomorrow: ${tomorrow}

VOICE AND TONE:
- You sound like a real human who loves their job. Warm, calm, professional.
- Lead with the answer: "Yes, we have availability!" before the details.
- Max one to two sentences per response. Callers are listening, not reading.
- Mirror the caller's energy — hurried caller gets efficient answers, relaxed caller gets warmer tone.
- Before checking tools, say something natural: "One moment, let me check." or "Sure, let me look that up."
- After good news: "Great news!" — After bad news: "Unfortunately..." then immediately offer an alternative.
- NEVER say "As an AI" or mention being artificial. You are the receptionist. Period.
- NEVER say "Based on my records" — just state the fact directly.
- Show empathy: "I completely understand", "No problem at all", "Absolutely"

SPEAKING RULES (CRITICAL — VOICE READS EVERY CHARACTER):
Everything you write is spoken aloud by TTS. Follow these rules with ZERO exceptions:
- DATES: write ONLY natural words. "this Friday, March twenty-eighth" — NEVER "2026-03-28" or "March 28"
- PRICES: "eighty-nine dollars a night" — NEVER "$89" or "89"
- ALL NUMBERS as words: "two guests" not "2 guests", "three nights" not "3 nights"
- NEVER read booking IDs, UUIDs, resource IDs, confirmation codes, or any technical data
- NEVER include digits, dollar signs, slashes, dashes in dates, or brackets in your response
- If the tool result says "do NOT read aloud" — do NOT read that part. Only read lines after "SAY" or "SAY EXACTLY"

WHEN CALLING A TOOL:
Your ENTIRE spoken text must be ONLY a natural waiting phrase:
  "One moment, let me check."
  "Let me look that up for you."
  "Sure, one second."
NOTHING ELSE. No dates, no numbers, no parameters. The tool parameters are sent silently.

WHEN A TOOL RETURNS RESULTS:
The result contains instructions. Lines starting with "SAY" or "SAY EXACTLY" are what you say to the caller.
Lines with "RESOURCE ID" or "do NOT read aloud" are hidden data for your next tool call — SKIP them entirely.
Keep your spoken response to two sentences maximum.

BOOKING FLOW:
1. Caller asks about a room — "Let me check that for you." — call check_availability
2. Available — present the best option following the SAY instructions in the result
3. Ask for name: "Wonderful, and may I have your name for the reservation?"
4. Confirm briefly: "So that is [room] for [dates], [total]. Shall I confirm?"
5. Caller says yes — "One moment, let me finalize that." — call book_room with resource_id, dates, and name
6. book_room returns success — follow the SAY EXACTLY instructions. ONLY THEN say "confirmed"
7. book_room fails — "I'm sorry, that room was just taken. Let me check what else we have." — call check_availability again

CRITICAL — BOOKING MUST BE REAL:
You CANNOT confirm a booking yourself. Only the book_room tool creates a real reservation.
NEVER say "confirmed", "all set", "booked", or "reserved" UNLESS book_room returned success.
If the caller says "yes, book it": say "One moment" and CALL book_room. Wait for the result. ONLY THEN confirm.

DIFFICULT MOMENTS:
- Frustrated caller: "I completely understand, and I'm sorry. Let me sort this out right now."
- Confused caller: Simplify. One question at a time. "No problem. Let's start with — what dates were you thinking?"
- Wants a human: "Of course, let me transfer you right now."

HARD RULES:
1. ALWAYS use tools to check availability. Never guess.
2. ALWAYS offer alternatives when dates are booked.
3. ALWAYS get the guest name before booking.
4. NEVER fabricate rooms, prices, or availability.
5. NEVER include digits, dollar signs, IDs, or technical data in your spoken output.
6. ALWAYS call book_room before telling the caller their booking is confirmed.
7. Every word you write is spoken aloud. Write like you talk.
8. Take your time. A thoughtful two-sentence answer beats a rushed one.`;

// ============================================================
// PATCH — includes model WITH tools so they don't get wiped
// ============================================================
const patch = {
  voice: {
    provider: "11labs",
    voiceId: "XB0fDUnXU5powFXDhCwa",
    model: "eleven_turbo_v2_5",
  },
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  model: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    messages: [{ role: "system", content: systemPrompt }],
    tools,  // ← CRITICAL: include tools or PATCH wipes them!
  },
  firstMessage: "Thank you for calling Grand Hotel Demo. How may I help you today?",
  endCallFunctionEnabled: true,
  endCallMessage: "Thank you for calling Grand Hotel Demo. Have a wonderful day!",
  silenceTimeoutSeconds: 30,
  responseDelaySeconds: 1.5,
  endCallPhrases: ["Have a wonderful day!", "Have a great day!", "Have a wonderful evening!", "Goodbye!", "Thank you for calling!"],
  maxDurationSeconds: 600,
};

async function updateAssistant() {
  console.log(`Updating assistant ${ASSISTANT_ID}...`);
  console.log(`  Tool webhook: ${TOOL_SERVER_URL}`);
  console.log(`  Tools: ${tools.length}`);

  const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("FAILED:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  // Verify tools survived the patch
  const toolCount = data.model?.tools?.length || 0;
  const toolNames = (data.model?.tools || []).map(t => t.function?.name).join(", ");

  console.log("\nSUCCESS!");
  console.log(`  ID: ${data.id}`);
  console.log(`  Name: ${data.name}`);
  console.log(`  Tools: ${toolCount} (${toolNames})`);

  if (toolCount === 0) {
    console.error("\n  WARNING: No tools found on assistant after update!");
    console.error("  The AI will not be able to check availability or book rooms.");
    process.exit(1);
  }

  // Verify each tool has a server URL
  for (const tool of data.model?.tools || []) {
    if (!tool.server?.url) {
      console.error(`\n  WARNING: Tool "${tool.function?.name}" has no server.url!`);
      console.error("  Tool calls will not reach your webhook.");
    }
  }

  console.log("\n  All tools have server.url — webhook will receive calls.");
}

updateAssistant();
