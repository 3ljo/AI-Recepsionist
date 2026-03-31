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
// VOICE RESULT FORMATTER — strip verbose/technical data
// so Claude never sees descriptions, IDs, or raw dates
// that it might accidentally read aloud to the caller.
// ============================================================
const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function spokenDate(dateStr) {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = monthNames[d.getMonth() + 1];
  const day = d.getDate();
  return `${weekday}, ${month} ${day}`;
}

function formatResultForVapi(toolName, result) {
  const r = JSON.parse(JSON.stringify(result));

  if (toolName === "check_availability" && r.rooms) {
    const count = r.rooms.length;
    // Strip descriptions, types — only keep what Claude needs
    r.rooms = r.rooms.map((room) => ({
      resource_id: room.resource_id,
      name: room.name,
      capacity: room.capacity,
      price: room.price,
    }));
    // Add a voice directive so Claude knows how to respond
    r._voice_directive = `There are ${count} room${count !== 1 ? "s" : ""} available. Tell the caller ONLY: how many rooms are left, how many guests each fits, and the price. Do NOT read room names or descriptions. Example: "We have ${count} rooms available — one fits up to two guests at eighty-nine dollars a night."`;
  }

  if (toolName === "book_room") {
    delete r.booking_id;
    if (r.confirmation) {
      const conf = r.confirmation;
      r._voice_directive = `Booking confirmed. Say ONLY: "You're all set, ${conf.guest_name}! Your reservation is confirmed, checking in ${spokenDate(conf.check_in)} and checking out ${spokenDate(conf.check_out)}. We look forward to welcoming you!" — NOTHING else. Do NOT read any IDs, prices, room details, or technical data.`;
    }
  }

  if (toolName === "find_next_available") {
    if (r.options) {
      r.options = r.options.map((opt) => ({
        resource_id: opt.resource_id,
        name: opt.name,
        date: opt.date,
        price: opt.price,
      }));
    }
  }

  if (toolName === "cancel_booking" || toolName === "modify_booking") {
    const data = r.cancelled || r.modified;
    if (data) {
      delete data.booking_id;
      if (data.check_in) data.check_in_spoken = spokenDate(data.check_in);
      if (data.check_out) data.check_out_spoken = spokenDate(data.check_out);
    }
  }

  return r;
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

        console.log("\nIncoming Vapi tool call:");
        console.log(JSON.stringify(body, null, 2));

        // Extract the function call from Vapi's message format
        const message = body.message;

        if (!message || message.type !== "function-call") {
          console.log("Not a function-call message, ignoring");
          return res.json({ result: "OK" });
        }

        const functionCall = message.functionCall;
        const toolName = functionCall.name;
        const params = functionCall.parameters;

        console.log(`\nTool: ${toolName}`);
        console.log(`   Params:`, JSON.stringify(params, null, 2));

        // Execute the tool against Supabase
        const result = await executeTool(
          toolName,
          params,
          DEMO_BUSINESS_ID
        );

        // Strip verbose data (descriptions, IDs, raw dates) so Claude
        // never accidentally reads technical info aloud to the caller
        const voiceResult = formatResultForVapi(toolName, result);

        console.log(`   Result:`, JSON.stringify(voiceResult, null, 2));

        // Send result back to Vapi in the expected format
        res.json({ result: JSON.stringify(voiceResult) });
      } catch (error) {
        console.error("Vapi tool-call error:", error);
        res.json({
          result: JSON.stringify({
            error: "Something went wrong. Please try again.",
          }),
        });
      }
    }
  );

  // ============================================================
  // POST /vapi/events — Vapi sends call lifecycle events here
  // (call started, ended, transcript, etc.)
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
            console.log(`\nCall ended!`);
            console.log(
              `   Duration: ${body.message.durationSeconds}s`
            );
            console.log(`   Cost: $${body.message.cost}`);
            if (body.message.summary) {
              console.log(`   Summary: ${body.message.summary}`);
            }
            break;

          case "transcript":
            const role =
              body.message.role === "assistant" ? "AI" : "Caller";
            console.log(`${role}: ${body.message.transcript}`);
            break;

          default:
            console.log(`Vapi event: ${messageType}`);
        }

        res.json({ ok: true });
      } catch (error) {
        console.error("Vapi event error:", error);
        res.json({ ok: true }); // Always 200 for events
      }
    }
  );

  console.log("   Vapi webhook routes registered:");
  console.log("      POST /vapi/tool-call");
  console.log("      POST /vapi/events");
}
