import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import tools from "../tools/definitions.js";
import { executeTool } from "../tools/handlers.js";
import supabase from "./supabase.js";

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================================
// BUILD SYSTEM PROMPT — personalized per business
// ============================================================
async function buildSystemPrompt(businessId) {
  // Fetch business info from database
  const { data: business, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error || !business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  // Fetch resources for context
  const { data: resources } = await supabase
    .from("resources")
    .select("name, type, description, capacity, price_per_unit, price_unit")
    .eq("business_id", businessId)
    .eq("is_active", true);

  const today = new Date().toISOString().split("T")[0];
  const roomList = resources
    ?.map(
      (r) =>
        `- ${r.name}: ${r.description} (up to ${r.capacity} guests, $${r.price_per_unit}/${r.price_unit})`
    )
    .join("\n");

  return `You are a professional, warm, and helpful AI receptionist for ${business.name}.

BUSINESS TYPE: ${business.type}
TODAY'S DATE: ${today}
TIMEZONE: ${business.timezone}
LANGUAGE: ${business.language}

YOUR GREETING (use this when starting a call):
"${business.greeting_message}"

AVAILABLE ROOMS/RESOURCES:
${roomList}

${business.system_prompt || ""}

RULES:
1. Be conversational, warm, and concise — you are on a PHONE CALL, not writing an essay.
2. Keep responses SHORT (1-3 sentences max). People are listening, not reading.
3. When a caller wants to book, ALWAYS use check_availability first.
4. If not available, IMMEDIATELY use find_next_available to suggest alternatives.
5. Before confirming a booking, ALWAYS ask for the guest's name.
6. After booking, repeat the confirmation details: name, room, dates, price.
7. If a caller asks for something outside your scope, politely say you can transfer them to a human.
8. Never make up availability — ALWAYS check the database.
9. Maximum booking advance: ${business.max_advance_days} days from today.
10. Be natural — use "um", "let me check", "one moment" to sound human-like.`;
}

// ============================================================
// PROCESS A SINGLE MESSAGE — the core AI loop
// Handles tool calls recursively until Claude gives a final text response
// ============================================================
async function processMessage(businessId, conversationHistory) {
  const systemPrompt = await buildSystemPrompt(businessId);

  // Call Claude
  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    tools: tools,
    messages: conversationHistory,
  });

  console.log(
    `\n🤖 Claude response [stop_reason: ${response.stop_reason}]`
  );

  // TOOL USE LOOP — Claude might call multiple tools before giving a final answer
  while (response.stop_reason === "tool_use") {
    // Find all tool use blocks in the response
    const toolUseBlocks = response.content.filter(
      (block) => block.type === "tool_use"
    );

    // Add Claude's response (with tool_use blocks) to conversation
    conversationHistory.push({
      role: "assistant",
      content: response.content,
    });

    // Execute each tool and collect results
    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(
        toolUse.name,
        toolUse.input,
        businessId
      );

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    // Add tool results to conversation
    conversationHistory.push({
      role: "user",
      content: toolResults,
    });

    // Call Claude again with the tool results
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools: tools,
      messages: conversationHistory,
    });

    console.log(
      `\n🤖 Claude follow-up [stop_reason: ${response.stop_reason}]`
    );
  }

  // Extract the final text response
  const textBlocks = response.content.filter(
    (block) => block.type === "text"
  );
  const aiResponse = textBlocks.map((b) => b.text).join(" ");

  // Add the final response to conversation history
  conversationHistory.push({
    role: "assistant",
    content: response.content,
  });

  return {
    response: aiResponse,
    conversationHistory,
  };
}

// ============================================================
// CONVERSATION MANAGER — manages multi-turn phone conversations
// ============================================================
const activeConversations = new Map();

export async function handleCall(businessId, callId, userMessage) {
  // Get or create conversation history for this call
  if (!activeConversations.has(callId)) {
    activeConversations.set(callId, []);
    console.log(`\n📞 New call started: ${callId}`);
  }

  const history = activeConversations.get(callId);

  // Add the new user message
  history.push({
    role: "user",
    content: userMessage,
  });

  // Process and get AI response
  const result = await processMessage(businessId, history);

  // Update stored history
  activeConversations.set(callId, result.conversationHistory);

  return result.response;
}

export function endCall(callId) {
  const history = activeConversations.get(callId);
  activeConversations.delete(callId);
  console.log(`\n📞 Call ended: ${callId}`);
  return history; // return for logging
}

export function getActiveCallCount() {
  return activeConversations.size;
}
