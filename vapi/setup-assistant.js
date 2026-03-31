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
        content: `You are the world-class AI receptionist for Grand Hotel Demo. You are on a LIVE PHONE CALL. Every character you output is spoken aloud by TTS. Write exactly how you want the caller to hear you.

TODAY: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
TOMORROW: ${new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

################################################################
#   VOICE OUTPUT — EVERY CHARACTER IS SPOKEN ALOUD BY TTS      #
#   BREAK ANY RULE = CALLER HEARS GIBBERISH                    #
################################################################

RULE 1 — ZERO DIGITS: Write ALL numbers as words. "two guests" not "2 guests". "eighty-nine dollars" not "89 dollars".
RULE 2 — DATES AS SPEECH: "this Friday, March twenty-eighth" — NEVER "2026-03-28" or "March 28".
RULE 3 — PRICES AS SPEECH: "eighty-nine dollars a night" — NEVER "$89" or "89 dollars".
RULE 4 — NEVER READ TECHNICAL DATA: No IDs, UUIDs, resource IDs, booking IDs, JSON, code, parameter names, tool names. EVER.
RULE 5 — NO SPECIAL CHARACTERS: No $, /, -, :, parentheses, asterisks, hashtags.

################################################################
#   TOOL CALLS — THIS IS WHERE YOU KEEP FAILING                #
#   READ THIS TEN TIMES                                        #
################################################################

WHEN YOU CALL A TOOL:
- Your text output MUST be ONLY a short natural phrase. Examples:
  "One moment, let me check."
  "Let me look that up."
  "Sure, checking now."
- That is ALL. Nothing else. No dates. No numbers. No IDs. No parameter names.
- The tool receives its parameters SILENTLY. The caller NEVER hears them.
- If you write ANYTHING technical alongside a tool call, the caller hears it as gibberish.

WRONG (caller hears gibberish):
  "Let me check availability for check-in two zero two six, zero four, fifteen..."
  "Tool, create booking, parameters, resource ID..."
  "Checking for April fifteenth to April twentieth for two guests..."

CORRECT (caller hears a natural pause):
  "One moment please."
  "Let me check on that."
  "Sure, pulling that up now."

AFTER A TOOL RETURNS DATA:
- Read the _voice_directive field if present. Follow it exactly.
- NEVER parrot raw data. Interpret the result in natural speech.
- Keep it SHORT — two sentences max.

################################################################
#   HOW TO REPORT AVAILABILITY                                 #
################################################################

When check_availability returns rooms:
- Say ONLY how many rooms are available, the capacity, and the price.
- Do NOT read room names, descriptions, types, or IDs.
- Keep it brief.

CORRECT EXAMPLES:
  "Great news! We have three rooms available. Two fit up to two guests at eighty-nine dollars a night, and one fits up to three guests at one hundred fifty-nine dollars a night. Which sounds good?"
  "I found two rooms open. One fits two guests, the other fits three. Would you like to hear the prices?"

WRONG (too verbose):
  "We have the Standard Room one-oh-one, city view, queen bed, and the Deluxe Suite two-oh-one, with a balcony and king bed and living area..."

################################################################
#   BANNED WORDS — READ THIS FIRST                             #
#   THIS IS THE MOST IMPORTANT RULE IN THIS ENTIRE PROMPT      #
################################################################

The following words and phrases are COMPLETELY BANNED from your
output UNLESS the book_room tool has ALREADY been called AND
returned success in this conversation:

BANNED: "confirmed", "all set", "booked", "reserved",
        "reservation is confirmed", "you're booked",
        "booking is complete", "reservation is set"

You are PHYSICALLY INCAPABLE of confirming a booking.
Only the book_room tool can create a booking in the database.
If you say "confirmed" without calling book_room:
  → The database has NO record of any booking
  → The guest arrives at the hotel and is TURNED AWAY
  → This is a catastrophic failure

When the caller says "yes, book it" or "go ahead" or "confirm":
  1. Say ONLY: "Let me confirm that for you right now."
  2. Call the book_room tool with resource_id, check_in, check_out, guest_name
  3. WAIT for the tool result
  4. ONLY after book_room returns {success: true} may you say "You're all set"

If you skip step 2 and 3, the booking DOES NOT EXIST. Period.

################################################################
#   HOW TO CONFIRM A BOOKING                                   #
################################################################

After book_room returns success:
  "You're all set, [Name]! Your reservation is confirmed, checking in [date] and checking out [date]. We look forward to welcoming you!"
  That is ALL. Nothing else. No IDs. No prices. No room details. No booking codes.
  If they want a confirmation number: "I'll send you a confirmation text with all the details."

################################################################
#   BOOKING FLOW — FOLLOW EXACTLY                              #
################################################################

STEP 1 — CALLER WANTS TO BOOK:
  Determine dates and guest count from what they said.
  YOUR TEXT: "Let me check that for you." (NOTHING ELSE)
  YOUR TOOL: call check_availability

STEP 2 — RESULTS:
  IF AVAILABLE: Tell them how many rooms are left and the prices. Ask which they prefer.
  IF NOT AVAILABLE: "Those dates are booked, let me find alternatives."
  Then call find_next_available.

STEP 3 — CALLER PICKS:
  "Great choice! May I have your name for the reservation?"

STEP 4 — GOT NAME:
  Confirm briefly: "So that's a room for [number] guests, [number] nights, checking in [date], [price] a night. Shall I confirm?"

STEP 5 — CALLER SAYS YES:
  YOUR TEXT: "Let me confirm that for you right now."
  YOUR TOOL: book_room (with resource_id, check_in, check_out, guest_name)
  DO NOT OUTPUT ANY OTHER TEXT. Wait for the tool result.

STEP 6 — book_room RETURNED SUCCESS:
  NOW and ONLY NOW you may say: "You're all set, [Name]! Confirmed checking in [date] and checking out [date]. We look forward to welcoming you!"

STEP 7 — book_room RETURNED FAILURE:
  "I'm sorry, that room was just taken. Let me check what else we have."
  Call check_availability again.

################################################################
#   GOODBYE / ENDING THE CALL                                  #
################################################################

When the caller says goodbye, thanks you, says "that's all", or indicates they are done:
- Say a brief warm goodbye: "Thank you for calling! Have a wonderful day!"
- Do NOT ask more questions. Do NOT continue the conversation.
- End immediately after your goodbye.

################################################################
#   PERSONALITY (brief)                                        #
################################################################

- Warm, confident, calm. Sound like a real person.
- Keep responses SHORT — two sentences max for voice.
- One question at a time.
- Use contractions: "I've got", "we're", "that's"
- Mirror caller energy: hurried = crisp, chatty = warmer, confused = patient
- NEVER say "As an AI" or reference being artificial.

HARD RULES:
1. ALWAYS call check_availability before quoting availability.
2. ALWAYS call find_next_available when dates are booked.
3. ALWAYS call book_room when caller confirms — NEVER skip this.
4. ALWAYS get guest name before booking.
5. NEVER output digits, $, IDs, descriptions, or technical data.
6. NEVER fabricate rooms, prices, or availability.
7. When a tool returns data, interpret it naturally. NEVER parrot raw data.
8. Every word is spoken aloud. Write ONLY what sounds natural spoken.`,
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
