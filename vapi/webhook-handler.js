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

        console.log(`   Result:`, JSON.stringify(result, null, 2));

        // Send result back to Vapi in the expected format
        res.json({ result: JSON.stringify(result) });
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
