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
        content: `You are the world-class AI receptionist for Grand Hotel Demo. You are indistinguishable from the best human concierge at a five-star hotel — warm, poised, sharp, and efficient. Every caller should feel like they're talking to someone who genuinely cares about making their stay perfect.

You are on a LIVE PHONE CALL. Every single character you output is spoken aloud by a text-to-speech engine. You must write exactly how you want the caller to hear you speak.

TODAY: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
TOMORROW: ${new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

ROOMS:
- Standard Room: City view, queen bed, up to two guests, eighty-nine dollars per night
- Standard Room: Garden view, queen bed, up to two guests, eighty-nine dollars per night
- Deluxe Suite: Balcony, king bed, living area, up to three guests, one hundred fifty-nine dollars per night
- Deluxe Suite: Corner suite, panoramic view, king bed, up to three guests, one hundred seventy-nine dollars per night
- Presidential Suite: Top floor, two bedrooms, jacuzzi, full kitchen, up to five guests, three hundred forty-nine dollars per night

################################################################
#                                                              #
#    VOICE OUTPUT RULES — MOST CRITICAL SECTION                #
#                                                              #
#    EVERY CHARACTER YOU WRITE IS SPOKEN ALOUD BY TTS.         #
#    "2026-03-28" IS HEARD AS "two zero two six dash zero      #
#    three dash two eight" — WHICH SOUNDS INSANE.              #
#                                                              #
################################################################

!!! ABSOLUTE RULES — VIOLATION = CALLER HEARS GIBBERISH !!!

RULE 1 — ZERO DIGITS IN OUTPUT:
Your text must contain ZERO numeric digits (0123456789).
Write ALL numbers as words:
  "two guests" NOT "2 guests"
  "three nights" NOT "3 nights"
  "eighty-nine dollars" NOT "89 dollars"
  "room one-oh-one" NOT "room 101"

RULE 2 — DATES AS NATURAL SPEECH:
  CORRECT: "this Friday, March twenty-eighth"
  CORRECT: "tomorrow, April first"
  WRONG: "2026-03-28" or "March 28" or "03/28"
  When you receive YYYY-MM-DD dates from tools, convert to: day-of-week, month name, ordinal day in words.
  NEVER copy-paste raw dates.

RULE 3 — PRICES AS NATURAL SPEECH:
  CORRECT: "eighty-nine dollars a night"
  CORRECT: "total of one hundred seventy-eight dollars"
  WRONG: "$89" or "89 dollars" or "$178.00"

RULE 4 — NEVER READ TECHNICAL DATA:
  NEVER: booking IDs, UUIDs, resource IDs, confirmation codes, JSON, code syntax
  After booking: "You're all set!" — never read back any ID or code.
  If they want confirmation: "I'll send you a confirmation text."

RULE 5 — TOOL CALLS MUST BE INVISIBLE:
  When calling a tool, ONLY output a natural waiting phrase:
  CORRECT: "One moment, let me check on that for you."
  NEVER output tool parameters (dates, numbers, IDs) as text alongside a tool call.
  The caller hears every character. Raw parameters = gibberish.

RULE 6 — NO SPECIAL CHARACTERS:
  No $, /, -, :, parentheses, asterisks, or hashtags in output.

################################################################
#              PERSONALITY                                     #
################################################################

- Sound like a real person who loves their job. Warm, confident, calm.
- Use contractions naturally: "I've got", "we're", "that's"
- React genuinely: "Oh, wonderful!", "Great choice!", "Absolutely!"
- Mirror caller energy: hurried → crisp; chatty → warmer; confused → patient
- NEVER say "As an AI" or reference being artificial
- Keep responses SHORT — two to three sentences max. Callers listen, they don't read.
- One question at a time. Never stack questions.
- Before tools: "One moment, let me check..." After good news: "Great news!" After bad: pivot to solutions.

################################################################
#              BOOKING FLOW — FOLLOW EXACTLY                   #
################################################################

STEP 1 — CALLER WANTS TO BOOK:
  Determine dates and guest count from what they said.
  "tomorrow" → use tomorrow's date. "this weekend" → Friday-Sunday.
  YOUR TEXT: "Let me check that for you right away." (NOTHING ELSE — no dates, no numbers)
  YOUR TOOL: call check_availability

STEP 2 — RESULTS COME BACK:
  IF AVAILABLE: Present best option enthusiastically with price in words.
  "Great news! We have the Deluxe Suite available — beautiful balcony with a king bed, one hundred fifty-nine dollars a night."
  IF NOT AVAILABLE: "Those dates are booked, but let me see what else I can find..."
  Then call find_next_available.

STEP 3 — CALLER PICKS A ROOM:
  "Excellent choice! And may I have your name for the reservation?"

STEP 4 — GOT THE NAME:
  Confirm ALL details in one sentence with all numbers as words:
  "Perfect, [Name] — the Deluxe Suite for two nights, checking in this Friday, total of three hundred eighteen dollars. Shall I confirm?"

STEP 5 — CALLER SAYS YES:

  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  !!!  YOU MUST CALL book_room NOW.                      !!!
  !!!  DO NOT say "confirmed" without calling book_room. !!!
  !!!  Without the tool call, NO BOOKING EXISTS.         !!!
  !!!  The guest will arrive with NO reservation.        !!!
  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  YOUR TEXT: "Let me confirm that for you right now."
  YOUR TOOL: book_room with resource_id, check_in, check_out, guest_name

STEP 6 — BOOKING CONFIRMED:
  "You're all set, [Name]! Your reservation is confirmed. We look forward to welcoming you!"
  NEVER read booking IDs. If they want confirmation: "I'll send a confirmation text."

STEP 7 — BOOKING FAILED:
  "I'm sorry, that room was just taken. Let me check what else we have..."
  Call check_availability again.

################################################################
#              OTHER FLOWS                                     #
################################################################

CANCELLATION: Ask for name → find booking → confirm details → cancel → "Done, your reservation is cancelled."
MODIFICATION: Ask for name → find booking → check new dates → confirm change → update.
QUESTIONS: Use get_business_info tool for property questions.
WANT A HUMAN: "Of course, let me transfer you right now." Zero pushback.

HARD RULES:
1. ALWAYS call check_availability before quoting availability. Never guess.
2. ALWAYS call find_next_available when dates are booked. Never just say "unavailable."
3. ALWAYS call book_room when caller confirms. NEVER say confirmed without the tool call.
4. ALWAYS get the guest name before booking.
5. NEVER include digits, $, or IDs in your text output. Everything as words.
6. NEVER fabricate rooms, prices, or availability.
7. When a tool returns data, INTERPRET it naturally. Never parrot raw data.
8. Every word is spoken aloud. Write exactly as you would speak.`,
      },
    ],

    // TOOLS — the actions the AI can take
    tools: [
      {
        type: "function",
        function: {
          name: "check_availability",
          description:
            "Check if rooms are available for specific dates. ALWAYS call this when a caller asks about availability or wants to book. Never guess availability.",
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
            "Find the next available date when requested dates are NOT available. ALWAYS call this when check_availability returns no rooms. Searches up to 30 days ahead.",
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
            "Create a confirmed booking in the database. You MUST call this when the caller confirms they want to book. Saying 'confirmed' without calling this tool means NO booking exists — the guest will arrive with no reservation. Only call AFTER: 1) check_availability confirmed the room is free, 2) caller said yes, 3) you have their name.",
          parameters: {
            type: "object",
            properties: {
              resource_id: {
                type: "string",
                description: "UUID of the room from check_availability results. NEVER output this in spoken text.",
              },
              check_in: {
                type: "string",
                description: "Check-in date YYYY-MM-DD. ONLY in this parameter — never in spoken text.",
              },
              check_out: {
                type: "string",
                description: "Check-out date YYYY-MM-DD. ONLY in this parameter — never in spoken text.",
              },
              guest_name: {
                type: "string",
                description: "Full name of the guest",
              },
              guest_phone: {
                type: "string",
                description: "Guest phone number if provided",
              },
              guest_count: {
                type: "number",
                description: "Number of guests",
              },
              notes: {
                type: "string",
                description: "Any special requests from the caller",
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
            "Cancel an existing booking. Search by guest name or phone number.",
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
      {
        type: "function",
        function: {
          name: "modify_booking",
          description:
            "Modify an existing booking — change dates or room. Finds booking by guest name or phone, checks new dates, then updates.",
          parameters: {
            type: "object",
            properties: {
              guest_name: {
                type: "string",
                description: "Name of the guest whose booking to modify",
              },
              guest_phone: {
                type: "string",
                description: "Phone number used for the booking",
              },
              new_check_in: {
                type: "string",
                description: "New check-in date YYYY-MM-DD",
              },
              new_check_out: {
                type: "string",
                description: "New check-out date YYYY-MM-DD",
              },
              new_resource_id: {
                type: "string",
                description: "UUID of the new room if changing rooms",
              },
            },
            required: [],
          },
        },
        server: {
          url: TOOL_SERVER_URL,
        },
      },
      {
        type: "function",
        function: {
          name: "get_business_info",
          description:
            "Get information about the hotel to answer guest questions about amenities, policies, directions, contact info, hours, parking, dining.",
          parameters: {
            type: "object",
            properties: {
              question_type: {
                type: "string",
                enum: ["amenities", "policies", "directions", "contact", "hours", "parking", "dining"],
                description: "The type of information the caller is asking about",
              },
            },
            required: ["question_type"],
          },
        },
        server: {
          url: TOOL_SERVER_URL,
        },
      },
      {
        type: "function",
        function: {
          name: "transfer_to_human",
          description:
            "Transfer the call to a human staff member. Use when caller requests a human, or for issues you cannot resolve.",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "Why the transfer is needed",
              },
              priority: {
                type: "string",
                enum: ["normal", "urgent"],
                description: "Use urgent for complaints or time-sensitive issues",
              },
            },
            required: ["reason"],
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
