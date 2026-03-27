import dotenv from "dotenv";

dotenv.config();

// ============================================================
// ENVIRONMENT VALIDATION — fail fast on missing config
// ============================================================

const required = [
  ["SUPABASE_URL", "Supabase project URL (Settings > API in your Supabase dashboard)"],
  ["SUPABASE_SERVICE_KEY", "Supabase service role key (Settings > API > service_role)"],
  ["ANTHROPIC_API_KEY", "Anthropic API key (console.anthropic.com > API Keys)"],
];

const missing = required.filter(([key]) => !process.env[key]);

if (missing.length > 0) {
  console.error("\n=== MISSING REQUIRED ENVIRONMENT VARIABLES ===\n");
  for (const [key, hint] of missing) {
    console.error(`  ${key} — ${hint}`);
  }
  console.error("\nCopy .env.example to .env and fill in the values.\n");
  process.exit(1);
}

const config = Object.freeze({
  // Required
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // Server
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : ["http://localhost:3000"],

  // Vapi (optional)
  vapiApiKey: process.env.VAPI_API_KEY || "",
  vapiAssistantId: process.env.VAPI_ASSISTANT_ID || "",
  vapiWebhookSecret: process.env.VAPI_WEBHOOK_SECRET || "",

  // Limits
  maxConcurrentAiCalls: parseInt(process.env.MAX_CONCURRENT_AI_CALLS || "10", 10),
  rateLimitChat: parseInt(process.env.RATE_LIMIT_CHAT || "30", 10),
  rateLimitVapi: parseInt(process.env.RATE_LIMIT_VAPI || "60", 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",
});

export default config;
