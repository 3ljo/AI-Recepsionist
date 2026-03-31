import crypto from "crypto";
import { executeTool } from "../tools/handlers.js";
import config from "../src/config.js";
import { vapiRateLimit } from "../src/middleware/rate-limit.js";

// ============================================================
// VAPI WEBHOOK HANDLER
// When Claude (inside Vapi) decides to call a tool,
// Vapi sends the request HERE, we execute it against Supabase,
// and send the result back so Claude can respond to the caller.
// ============================================================

const DEMO_BUSINESS_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ============================================================
// VOICE RESULT FORMATTER
// Returns PLAIN TEXT with exact scripts for Claude to say.
// Claude gets clear instructions + the exact words to speak.
// No JSON to parse = no chance of reading raw data aloud.
// ============================================================
const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const numberWords = [
  "zero", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
  "twenty-one", "twenty-two", "twenty-three", "twenty-four", "twenty-five",
  "twenty-six", "twenty-seven", "twenty-eight", "twenty-nine", "thirty",
  "thirty-one",
];

const tensWords = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numToWords(n) {
  if (n <= 31 && numberWords[n]) return numberWords[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones === 0 ? tensWords[tens] : `${tensWords[tens]}-${numberWords[ones]}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    return remainder === 0
      ? `${numberWords[hundreds]} hundred`
      : `${numberWords[hundreds]} hundred ${numToWords(remainder)}`;
  }
  return String(n);
}

function spokenDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = monthNames[d.getMonth() + 1];
  const day = d.getDate();
  return `${weekday}, ${month} ${numToWords(day)}`;
}

function spokenPrice(priceStr) {
  const n = parseInt(priceStr, 10);
  if (isNaN(n)) return priceStr;
  return `${numToWords(n)} dollars`;
}

function extractPriceNum(priceStr) {
  const match = String(priceStr).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function formatResultForVapi(toolName, result) {
  // ── CHECK AVAILABILITY ──────────────────────────────────
  if (toolName === "check_availability") {
    if (result.error) {
      return "System is temporarily unavailable. Say: I'm having trouble checking our system right now. Can I take your number and call you back?";
    }
    if (!result.available || !result.rooms || result.rooms.length === 0) {
      return "No rooms available for those dates. You MUST now call the find_next_available tool to offer alternatives. Say: Those dates are fully booked, but let me see what else I can find.";
    }

    const rooms = result.rooms;
    const count = rooms.length;

    // Group rooms by capacity+price for a clean summary
    const groups = {};
    rooms.forEach((r) => {
      const price = extractPriceNum(r.price);
      const key = `${r.capacity}_${price}`;
      if (!groups[key]) {
        groups[key] = { capacity: r.capacity, price, count: 0, ids: [] };
      }
      groups[key].count++;
      groups[key].ids.push(r.resource_id);
    });

    const groupList = Object.values(groups);

    // Build the spoken summary
    let spoken = `Great news! We have ${numToWords(count)} room${count > 1 ? "s" : ""} available. `;
    groupList.forEach((g, i) => {
      if (i > 0) spoken += "And ";
      spoken += `${g.count > 1 ? numToWords(g.count) : "one"} fit${g.count === 1 ? "s" : ""} up to ${numToWords(g.capacity)} guests at ${spokenPrice(g.price)} a night. `;
    });
    spoken += "Which would you prefer?";

    // Build resource_id reference for Claude to use later
    let idRef = "RESOURCE IDS (do NOT read aloud, use for book_room later): ";
    rooms.forEach((r, i) => {
      idRef += `Option ${i + 1} (${numToWords(r.capacity)} guests, ${spokenPrice(extractPriceNum(r.price))}): ${r.resource_id}. `;
    });

    return `${idRef}

SAY TO CALLER: "${spoken}"

NEXT: Ask which option they want and get their name. When they confirm, you MUST call book_room with the matching resource_id from above.`;
  }

  // ── BOOK ROOM ───────────────────────────────────────────
  if (toolName === "book_room") {
    if (result.error || !result.success) {
      const msg = result.message || "Booking failed.";
      return `BOOKING FAILED: ${msg}. Say: I'm sorry, that room was just taken. Let me check what else we have. Then call check_availability again.`;
    }

    const c = result.confirmation;
    return `BOOKING SUCCESSFUL.

SAY EXACTLY: "You're all set, ${c.guest_name}! Your reservation is confirmed, checking in ${spokenDate(c.check_in)} and checking out ${spokenDate(c.check_out)}. We look forward to welcoming you!"

Say NOTHING else. Do NOT read any IDs, prices, room numbers, or other details.`;
  }

  // ── FIND NEXT AVAILABLE ─────────────────────────────────
  if (toolName === "find_next_available") {
    if (!result.found || !result.options || result.options.length === 0) {
      return "No availability found in the next thirty days. Say: Unfortunately we're fully booked for the next month. Would you like me to take your number so we can call you when something opens up?";
    }

    const opt = result.options[0];
    return `NEXT AVAILABLE: ${spokenDate(opt.date)}, ${spokenPrice(opt.price)} a night, fits up to ${numToWords(opt.capacity || 2)} guests. Resource ID (do NOT read aloud): ${opt.resource_id}.

SAY: "The earliest I have is ${spokenDate(opt.date)}, at ${spokenPrice(opt.price)} a night. Would that work for you?"

If they say yes, get their name and call book_room with resource_id ${opt.resource_id}.`;
  }

  // ── CANCEL BOOKING ──────────────────────────────────────
  if (toolName === "cancel_booking") {
    if (!result.success) {
      return `${result.message || "No booking found."}. Say this naturally to the caller.`;
    }
    const c = result.cancelled;
    return `CANCELLED. Say: "Done! Your reservation for ${spokenDate(c.check_in)} to ${spokenDate(c.check_out)} has been cancelled. Is there anything else I can help with?"`;
  }

  // ── MODIFY BOOKING ─────────────────────────────────────
  if (toolName === "modify_booking") {
    if (!result.success) {
      return `${result.message || "Could not modify."}. Say this naturally to the caller.`;
    }
    const m = result.modified;
    return `MODIFIED. Say: "All updated! You're now booked from ${spokenDate(m.check_in)} to ${spokenDate(m.check_out)}. Anything else?"`;
  }

  // ── GET BUSINESS INFO ──────────────────────────────────
  if (toolName === "get_business_info") {
    return result.info || "I don't have that information available.";
  }

  // ── TRANSFER TO HUMAN ──────────────────────────────────
  if (toolName === "transfer_to_human") {
    return "Transfer initiated. Say: I'm connecting you with our team right now. One moment please.";
  }

  // ── DEFAULT ────────────────────────────────────────────
  return JSON.stringify(result);
}

// ============================================================
// Vapi webhook signature verification
// ============================================================
function verifyVapiSignature(req, res, next) {
  const secret = config.vapiWebhookSecret;

  // If no secret configured, skip verification (development mode)
  if (!secret) {
    return next();
  }

  const signature = req.headers["x-vapi-signature"];
  if (!signature) {
    console.warn(
      `Vapi webhook rejected: missing signature from ${req.ip}`
    );
    return res.status(401).json({ error: "Missing webhook signature" });
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    console.warn(
      `Vapi webhook rejected: invalid signature from ${req.ip}`
    );
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  next();
}

export function registerVapiRoutes(app) {
  const rateLimit = vapiRateLimit(config.rateLimitVapi);

  // ============================================================
  // POST /vapi/tool-call — Vapi sends tool calls here
  // ============================================================
  app.post(
    "/vapi/tool-call",
    rateLimit,
    verifyVapiSignature,
    async (req, res) => {
      try {
        const body = req.body;

        // Extract the function call from Vapi's message format
        const message = body.message;

        if (!message || message.type !== "function-call") {
          return res.json({ result: "OK" });
        }

        const functionCall = message.functionCall;
        const toolName = functionCall.name;
        const params = functionCall.parameters;

        console.log(`Vapi tool: ${toolName}`, JSON.stringify(params));

        // Execute the tool against Supabase
        const result = await executeTool(
          toolName,
          params,
          DEMO_BUSINESS_ID
        );

        // Format as plain-text voice script — NOT raw JSON
        const voiceResult = formatResultForVapi(toolName, result);

        console.log(`Vapi result: ${voiceResult.substring(0, 200)}...`);

        // Return as plain text string — Claude reads instructions, not JSON
        res.json({ result: voiceResult });
      } catch (error) {
        console.error("Vapi tool-call error:", error);
        res.json({
          result: "Something went wrong with our system. Say: I'm having a moment, could you give me one second?",
        });
      }
    }
  );

  // ============================================================
  // POST /vapi/events — Vapi sends call lifecycle events here
  // ============================================================
  app.post(
    "/vapi/events",
    rateLimit,
    verifyVapiSignature,
    async (req, res) => {
      try {
        const body = req.body;
        const messageType = body.message?.type;

        switch (messageType) {
          case "status-update":
            console.log(`Call status: ${body.message.status}`);
            break;

          case "end-of-call-report":
            console.log(`Call ended! Duration: ${body.message.durationSeconds}s`);
            break;

          case "transcript":
            const role = body.message.role === "assistant" ? "AI" : "Caller";
            console.log(`${role}: ${body.message.transcript}`);
            break;

          default:
            break;
        }

        res.json({ ok: true });
      } catch (error) {
        console.error("Vapi event error:", error);
        res.json({ ok: true });
      }
    }
  );

  console.log("   Vapi webhook routes registered");
}
