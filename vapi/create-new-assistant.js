import dotenv from "dotenv";
dotenv.config();

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const SERVER_URL = "https://ai-recepsionist.onrender.com";
const TOOL_SERVER_URL = `${SERVER_URL}/vapi/tool-call`;

const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

const systemPrompt = `You are the AI receptionist for Grand Hotel Demo. LIVE PHONE CALL — every character you write is spoken aloud by TTS.

Today: ${today}
Tomorrow: ${tomorrow}

VOICE RULES (break any = caller hears garbage):
- ZERO digits in your output. All numbers as words: "two guests", "eighty-nine dollars"
- Dates as speech: "this Friday, March twenty-eighth" — NEVER "2026-03-28"
- No IDs, UUIDs, JSON, code, tool names, parameter names, or technical data. EVER.
- No special characters: no dollar sign, no slash, no dash, no colon, no parentheses

WHEN CALLING A TOOL:
Your ENTIRE text output must be ONLY a short phrase:
  "One moment please."
  "Let me check on that."
  "Sure, let me look that up."
NOTHING ELSE. No dates, no numbers, no guest counts, no parameters.

WHEN A TOOL RETURNS RESULTS:
The tool result contains instructions starting with "SAY" or "SAY TO CALLER" or "SAY EXACTLY".
Follow those instructions. Say what it tells you to say.
Do NOT read any line that says "RESOURCE ID" or "do NOT read aloud".
Keep your response to two sentences maximum.

THE BOOKING FLOW:
1. Caller wants to book — say "Let me check that for you." — call check_availability
2. Results come back — follow the SAY instructions in the result
3. Caller picks a room — "Great choice! And what is your name?"
4. Got name — confirm briefly: "So that is a room for [guests], [nights] nights, checking in [date]. Shall I book it?"
5. Caller says yes — say "One moment, let me finalize that." — call book_room — WAIT for result
6. book_room succeeded — follow the SAY EXACTLY instructions in the result
7. book_room failed — "Sorry, that room was just taken. Let me check again." — call check_availability

CRITICAL — BOOKING MUST BE REAL:
You CANNOT confirm a booking by yourself. Only the book_room tool creates a real booking.
NEVER say "confirmed", "all set", "booked", or "reserved" UNLESS book_room has returned a success result.
If the caller says "yes, book it":
  Say "One moment, let me finalize that."
  Call book_room with resource_id, check_in, check_out, guest_name
  WAIT for the result
  ONLY THEN say what the result tells you to say

ENDING THE CALL:
When the caller says goodbye or "that is all":
  Say "Thank you for calling! Have a wonderful day!" and STOP.

PERSONALITY:
Warm, confident, brief. Two sentences max. One question at a time.
Sound like a real person, not a robot. NEVER mention being AI.`;

function makeTool(name, description, parameters, required) {
  return {
    type: "function",
    function: { name, description, parameters: { type: "object", properties: parameters, required } },
    server: { url: TOOL_SERVER_URL },
  };
}

const assistantConfig = {
  name: "AI Receptionist v2",
  voice: { provider: "11labs", voiceId: "XB0fDUnXU5powFXDhCwa", model: "eleven_turbo_v2_5" },
  model: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    messages: [{ role: "system", content: systemPrompt }],
    tools: [
      makeTool("check_availability", "Check room availability for dates. ALWAYS call this first.", {
        check_in: { type: "string", description: "Check-in date YYYY-MM-DD" },
        check_out: { type: "string", description: "Check-out date YYYY-MM-DD" },
        guest_count: { type: "number", description: "Number of guests" },
      }, ["check_in"]),
      makeTool("find_next_available", "Find next available date when requested dates are full.", {
        from_date: { type: "string", description: "Start date YYYY-MM-DD" },
        guest_count: { type: "number", description: "Number of guests" },
      }, ["from_date"]),
      makeTool("book_room", "Create a booking. MUST call this when caller confirms. Without this tool, NO booking exists.", {
        resource_id: { type: "string", description: "Room UUID from check_availability" },
        check_in: { type: "string", description: "Check-in date YYYY-MM-DD" },
        check_out: { type: "string", description: "Check-out date YYYY-MM-DD" },
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
    ],
  },
  firstMessage: "Thank you for calling Grand Hotel Demo. How may I help you today?",
  endCallMessage: "Thank you for calling Grand Hotel Demo. Have a wonderful day!",
  endCallFunctionEnabled: true,
  endCallPhrases: ["Have a wonderful day!", "Have a great day!", "Have a wonderful evening!", "Goodbye!", "Thank you for calling!"],
  responseDelaySeconds: 1.0,
  silenceTimeoutSeconds: 15,
  maxDurationSeconds: 600,
  transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
};

async function run() {
  console.log("Creating NEW Vapi assistant...");
  console.log("Tool webhook:", TOOL_SERVER_URL);

  const response = await fetch("https://api.vapi.ai/assistant", {
    method: "POST",
    headers: { Authorization: `Bearer ${VAPI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(assistantConfig),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("FAILED:", err);
    process.exit(1);
  }

  const assistant = await response.json();
  const toolCount = assistant.model?.tools?.length || 0;

  console.log("\nSUCCESS!");
  console.log("  ID:", assistant.id);
  console.log("  Name:", assistant.name);
  console.log("  Tools:", toolCount);
  console.log("  Webhook:", TOOL_SERVER_URL);
  console.log("\nUPDATE THESE FILES:");
  console.log("  .env -> VAPI_ASSISTANT_ID=" + assistant.id);
  console.log("  frontend/.env -> NEXT_PUBLIC_VAPI_ASSISTANT_ID=" + assistant.id);
}

run();
