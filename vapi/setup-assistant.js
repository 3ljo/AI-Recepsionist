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
        content: `You are the AI receptionist for Grand Hotel Demo. LIVE PHONE CALL — every character you write is spoken aloud by TTS.

Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
Tomorrow: ${new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

═══════════════════════════════════════════
  VOICE RULES (break any = caller hears garbage)
═══════════════════════════════════════════
- ZERO digits in your output. All numbers as words: "two guests", "eighty-nine dollars"
- Dates as speech: "this Friday, March twenty-eighth" — NEVER "2026-03-28"
- No IDs, UUIDs, JSON, code, tool names, parameter names, or technical data. EVER.
- No special characters: no $, /, -, :, parentheses, asterisks

═══════════════════════════════════════════
  WHEN CALLING A TOOL
═══════════════════════════════════════════
Your ENTIRE text output must be ONLY a short phrase:
  "One moment please."
  "Let me check on that."
  "Sure, let me look that up."

NOTHING ELSE. No dates, no numbers, no guest counts, no parameters.
The tool parameters are sent silently — the caller never hears them.

═══════════════════════════════════════════
  WHEN A TOOL RETURNS RESULTS
═══════════════════════════════════════════
The tool result contains instructions starting with "SAY" or "SAY TO CALLER" or "SAY EXACTLY".
Follow those instructions. Say what it tells you to say.
Do NOT read any line that says "RESOURCE ID" or "do NOT read aloud".
Keep your response to two sentences maximum.

═══════════════════════════════════════════
  THE BOOKING FLOW
═══════════════════════════════════════════
1. Caller wants to book → say "Let me check that for you." → call check_availability
2. Results come back → follow the SAY instructions in the result
3. Caller picks a room → "Great choice! And what's your name?"
4. Got name → confirm briefly: "So that's a room for [guests], [nights] nights, checking in [date]. Shall I book it?"
5. Caller says yes → say "One moment, let me finalize that." → call book_room → WAIT for result
6. book_room succeeded → follow the SAY EXACTLY instructions in the result
7. book_room failed → "Sorry, that room was just taken. Let me check again." → call check_availability

═══════════════════════════════════════════
  CRITICAL — BOOKING MUST BE REAL
═══════════════════════════════════════════
You CANNOT confirm a booking by yourself. Only the book_room tool creates a real booking.

NEVER say "confirmed", "all set", "booked", or "reserved" UNLESS book_room has returned a success result.

If the caller says "yes, book it":
  → Say "One moment, let me finalize that."
  → Call book_room with resource_id, check_in, check_out, guest_name
  → WAIT for the result
  → ONLY THEN say what the result tells you to say

If you skip calling book_room, the guest arrives at the hotel with NO reservation.

═══════════════════════════════════════════
  ENDING THE CALL
═══════════════════════════════════════════
When the caller says goodbye or "that's all":
  Say "Thank you for calling! Have a wonderful day!" and STOP.
  Do NOT ask more questions.

═══════════════════════════════════════════
  PERSONALITY
═══════════════════════════════════════════
Warm, confident, brief. Two sentences max. One question at a time.
Use contractions naturally. Sound like a real person, not a robot.
NEVER say "As an AI" or mention being artificial.`,
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
  endCallFunctionEnabled: true,      // allows AI to end the call programmatically
  endCallPhrases: [
    "Have a wonderful day!",
    "Have a great day!",
    "Have a wonderful evening!",
    "Have a great evening!",
    "Goodbye!",
    "Thank you for calling!",
  ],
  responseDelaySeconds: 1.0,         // faster response
  silenceTimeoutSeconds: 15,         // shorter silence timeout to end quicker
  maxDurationSeconds: 600,           // 10 min max call
  
  // TRANSCRIPTION — Deepgram Nova 2
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
};

// ============================================================
// CREATE OR UPDATE THE ASSISTANT VIA VAPI API
// If VAPI_ASSISTANT_ID is set in .env, updates the existing one.
// Otherwise creates a new assistant.
// ============================================================
const EXISTING_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

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
      console.error("Failed to create assistant:", error);
      process.exit(1);
    }

    const assistant = await response.json();

    console.log(`Assistant created successfully!`);
    console.log(`   ID: ${assistant.id}`);
    console.log(`   Name: ${assistant.name}`);
    console.log(`\nSave this Assistant ID in your .env:`);
    console.log(`   VAPI_ASSISTANT_ID=${assistant.id}`);

    return assistant;
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

async function updateAssistant() {
  try {
    console.log(`Updating existing assistant: ${EXISTING_ASSISTANT_ID}`);

    const response = await fetch(
      `https://api.vapi.ai/assistant/${EXISTING_ASSISTANT_ID}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assistantConfig),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to update assistant:", error);
      process.exit(1);
    }

    const assistant = await response.json();

    console.log(`Assistant updated successfully!`);
    console.log(`   ID: ${assistant.id}`);
    console.log(`   Name: ${assistant.name}`);
    console.log(`   Changes are live immediately.`);

    return assistant;
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// If we have an existing assistant ID, update it. Otherwise create new.
if (EXISTING_ASSISTANT_ID) {
  updateAssistant();
} else {
  createAssistant();
}
