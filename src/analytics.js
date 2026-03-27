import supabase from "./supabase.js";
import logger from "./logger.js";

// ============================================================
// CONVERSATION ANALYTICS
// Analyze completed calls and log to call_analytics table
// ============================================================

const POSITIVE_KEYWORDS = [
  "thank", "thanks", "great", "perfect", "wonderful", "excellent",
  "awesome", "appreciate", "love", "fantastic", "happy",
];

const NEGATIVE_KEYWORDS = [
  "frustrated", "angry", "upset", "terrible", "horrible", "awful",
  "ridiculous", "unacceptable", "complaint", "worst", "disappointing",
];

function analyzeSentiment(messages) {
  const text = messages
    .filter((m) => m.role === "user")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join(" ")
    .toLowerCase();

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of POSITIVE_KEYWORDS) {
    if (text.includes(word)) positiveCount++;
  }
  for (const word of NEGATIVE_KEYWORDS) {
    if (text.includes(word)) negativeCount++;
  }

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

function extractToolsUsed(messages) {
  const tools = new Set();
  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "tool_use") {
          tools.add(block.name);
        }
      }
    }
  }
  return [...tools];
}

function determineOutcome(toolsUsed) {
  if (toolsUsed.includes("transfer_to_human")) return "transferred";
  if (toolsUsed.includes("book_room")) return "booking_made";
  if (toolsUsed.includes("cancel_booking")) return "booking_cancelled";
  if (toolsUsed.includes("modify_booking")) return "booking_modified";
  if (toolsUsed.length > 0) return "info_only";
  return "abandoned";
}

function countTurns(messages) {
  return messages.filter((m) => m.role === "user").length;
}

export async function analyzeCall(businessId, callId, history, startTime) {
  try {
    const toolsUsed = extractToolsUsed(history);
    const outcome = determineOutcome(toolsUsed);
    const turnCount = countTurns(history);
    const sentiment = analyzeSentiment(history);
    const durationSeconds = startTime
      ? Math.round((Date.now() - startTime) / 1000)
      : null;

    // Determine if resolution was achieved
    const resolutionAchieved = [
      "booking_made",
      "booking_cancelled",
      "booking_modified",
      "transferred",
    ].includes(outcome);

    const analytics = {
      business_id: businessId,
      call_id: callId,
      outcome,
      tools_used: toolsUsed,
      turn_count: turnCount,
      sentiment,
      resolution_achieved: resolutionAchieved,
      duration_seconds: durationSeconds,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("call_analytics").insert(analytics);

    if (error) {
      logger.warn("Failed to save call analytics", { callId, error: error.message });
    } else {
      logger.info("Call analytics saved", { callId, outcome, sentiment });
    }

    return analytics;
  } catch (err) {
    logger.warn("Analytics error", { callId, error: err.message });
    return null;
  }
}
