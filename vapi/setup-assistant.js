import dotenv from "dotenv";
dotenv.config();

// ============================================================
// SETUP VAPI ASSISTANT — run this ONCE to create your AI receptionist
// Usage: node vapi/setup-assistant.js https://your-ngrok-url.ngrok.io
// ============================================================

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!VAPI_API_KEY) {
  console.error("❌ Missing VAPI_API_KEY in .env");
  process.exit(1);
}

// Get the server URL from command line args
const SERVER_URL = process.argv[2];
if (!SERVER_URL) {
  console.error("❌ Please provide your public server URL:");
  console.error("   node vapi/setup-assistant.js https://your-url.ngrok.io");
  process.exit(1);
}

const TOOL_SERVER_URL = `${SERVER_URL}/vapi/tool-call`;

console.log(`\n🔧 Setting up Vapi Assistant...`);
console.log(`   Tool webhook URL: ${TOOL_SERVER_URL}\n`);

// ============================================================
// ASSISTANT CONFIGURATION
// ============================================================
const assistantConfig = {
  name: "AI Receptionist - Grand Hotel Demo",

  // VOICE — 11labs Charlotte (warm & conversational)
  voice: {
    provider: "11labs",
    voiceId: "XB0fDUnXU5powFXDhCwa",
    model: "eleven_turbo_v2_5",
  },

  // MODEL — the AI brain
  model: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    messages: [
      {
        role: "system",
        content: `You are the front desk receptionist at Grand Hotel Demo. You answer phone calls with the poise and warmth of a five-star concierge — calm, confident, and genuinely helpful.

TODAY'S DATE: ${new Date().toISOString().split("T")[0]}

ROOMS:
- Standard Room 101: City view, queen bed, up to 2 guests, 89 dollars per night
- Standard Room 102: Garden view, queen bed, up to 2 guests, 89 dollars per night
- Deluxe Suite 201: Balcony, king bed, living area, up to 3 guests, 159 dollars per night
- Deluxe Suite 202: Corner suite, panoramic view, king bed, up to 3 guests, 179 dollars per night
- Presidential Suite: Top floor, 2 bedrooms, jacuzzi, full kitchen, up to 5 guests, 349 dollars per night

VOICE & TONE:
- Sound like a real human who loves their job. Warm, calm, professional.
- Lead with the answer: "Yes, we have availability!" — then details.
- Max 1-2 sentences per response. Callers are listening, not reading.
- Before tools: "One moment, let me check." After good news: "Great news!" After bad news: "Unfortunately..." then pivot to a solution.
- NEVER say "As an AI" or reference being artificial. You ARE the receptionist.
- Mirror the caller — if they're in a hurry, be efficient. If relaxed, be warmer.

SPEAKING RULES (CRITICAL — TTS READS EVERY CHARACTER):
Everything you write is spoken aloud. "2026-03-28" becomes "two zero two six dash..." which sounds terrible.

ABSOLUTE RULE: Your text output must contain ZERO digits (0-9), ZERO special characters ($, /, -), and ZERO technical data. Every single character you write will be spoken aloud by TTS.

DATES — write ONLY words, ZERO digits:
- "this Friday, March twenty-eighth" — NEVER "2026-03-28" or "March 28"

PRICES — write ONLY words:
- "eighty-nine dollars a night" — NEVER "$89"
- Totals: "one hundred seventy-eight dollars total" not "$178"

NUMBERS — ALL as words: "two nights" not "2 nights", "three guests" not "3 guests"
IDs/CODES — NEVER read booking IDs, UUIDs, resource_ids, or codes. Say "You're all set!"

TOOL CALL RULE (CRITICAL):
When you call a function/tool, your spoken text must ONLY be a natural waiting phrase like "One moment, let me check..."
NEVER output the tool parameters (dates, numbers, IDs) as text. The caller will hear every character you write.
WRONG: "2026-03-30 2026-03-31 5" — this gets spoken aloud as gibberish
RIGHT: "One moment, let me check on that..." — natural speech while the tool runs

BOOKING FLOW:
1. Caller wants a room -> Say "One moment, let me check..." -> call check_availability tool
2. Available -> Best option: "Great news! We have [Room] — [highlight], [price] per night."
3. Get name: "May I have your name for the reservation?"
4. Confirm details with caller: "[Name], [Room] for [dates], [total]. Shall I confirm?"
5. Caller says yes -> YOU MUST call the book_room tool. Do NOT just say it's confirmed — actually call book_room!
6. After book_room returns success: "You're all set! Your reservation is confirmed."
7. If book_room fails: tell the caller and offer alternatives.

CRITICAL: Saying "confirmed" without calling book_room means the booking is NOT saved. ALWAYS call book_room before confirming.

HARD RULES:
1. ALWAYS check tools for availability. Never guess.
2. ALWAYS offer alternatives when booked.
3. ALWAYS get the name before booking.
4. NEVER include digits (0-9), $, or IDs in your response. Spell everything as words.
5. Take your time — a clear, thoughtful answer beats a rushed robotic one.
6. Every word is spoken aloud. Write like you talk.`,
      },
    ],

    // TOOLS — the actions the AI can take
    tools: [
      {
        type: "function",
        function: {
          name: "check_availability",
          description:
            "Check if rooms are available for specific dates. Use this EVERY TIME a caller asks about availability or wants to book.",
          parameters: {
            type: "object",
            properties: {
              check_in: {
                type: "string",
                description: "Check-in date in YYYY-MM-DD format",
              },
              check_out: {
                type: "string",
                description:
                  "Check-out date in YYYY-MM-DD format. Defaults to check_in + 1 day if not specified.",
              },
              guest_count: {
                type: "number",
                description: "Number of guests. Defaults to 1.",
              },
            },
            required: ["check_in"],
          },
        },
        server: {
          url: TOOL_SERVER_URL,
        },
      },
      {
        type: "function",
        function: {
          name: "find_next_available",
          description:
            "When requested dates are NOT available, find the next available date. Searches up to 30 days ahead.",
          parameters: {
            type: "object",
            properties: {
              from_date: {
                type: "string",
                description:
                  "Start searching from this date (YYYY-MM-DD). Usually the date the caller originally wanted.",
              },
              guest_count: {
                type: "number",
                description: "Number of guests. Defaults to 1.",
              },
            },
            required: ["from_date"],
          },
        },
        server: {
          url: TOOL_SERVER_URL,
        },
      },
      {
        type: "function",
        function: {
          name: "book_room",
          description:
            "Create a confirmed booking. Only use AFTER: 1) checking availability, 2) caller confirmed they want to book, 3) you have their name.",
          parameters: {
            type: "object",
            properties: {
              resource_id: {
                type: "string",
                description: "UUID of the room from check_availability results",
              },
              check_in: {
                type: "string",
                description: "Check-in date YYYY-MM-DD",
              },
              check_out: {
                type: "string",
                description: "Check-out date YYYY-MM-DD",
              },
              guest_name: {
                type: "string",
                description: "Full name of the guest",
              },
              guest_phone: {
                type: "string",
                description: "Guest phone number",
              },
              guest_count: {
                type: "number",
                description: "Number of guests",
              },
              notes: {
                type: "string",
                description: "Any special requests",
              },
            },
            required: ["resource_id", "check_in", "check_out", "guest_name"],
          },
        },
        server: {
          url: TOOL_SERVER_URL,
        },
      },
      {
        type: "function",
        function: {
          name: "cancel_booking",
          description:
            "Cancel an existing booking. Search by guest name or phone.",
          parameters: {
            type: "object",
            properties: {
              guest_name: {
                type: "string",
                description: "Name of the guest",
              },
              guest_phone: {
                type: "string",
                description: "Phone number used for booking",
              },
            },
            required: [],
          },
        },
        server: {
          url: TOOL_SERVER_URL,
        },
      },
    ],
  },

  // FIRST MESSAGE
  firstMessage:
    "Thank you for calling Grand Hotel Demo. How may I help you today?",

  // CALL SETTINGS
  endCallMessage: "Thank you for calling Grand Hotel Demo. Have a wonderful day!",
  responseDelaySeconds: 1.5,        // let the AI think before speaking
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 600,           // 10 min max call
  
  // TRANSCRIPTION — Deepgram Nova 2
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
};

// ============================================================
// CREATE THE ASSISTANT VIA VAPI API
// ============================================================
async function createAssistant() {
  try {
    const response = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assistantConfig),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Failed to create assistant:", error);
      process.exit(1);
    }

    const assistant = await response.json();

    console.log(`✅ Assistant created successfully!`);
    console.log(`   ID: ${assistant.id}`);
    console.log(`   Name: ${assistant.name}`);
    console.log(`\n📋 Save this Assistant ID in your .env:`);
    console.log(`   VAPI_ASSISTANT_ID=${assistant.id}`);
    console.log(`\n📞 Next: Get a phone number from Vapi dashboard:`);
    console.log(`   1. Go to dashboard.vapi.ai > Phone Numbers`);
    console.log(`   2. Buy or import a number`);
    console.log(`   3. Assign this assistant to that number`);
    console.log(`\n🧪 Or test it right now with a web call:`);
    console.log(`   Go to dashboard.vapi.ai > Assistants > Click your assistant > Test`);

    return assistant;
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createAssistant();
