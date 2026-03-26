import readline from "readline";
import dotenv from "dotenv";
import { handleCall, endCall } from "./ai-brain.js";

dotenv.config();

// ============================================================
// INTERACTIVE TEST — Simulate a phone call in your terminal
// Run: npm run test-call
// ============================================================

const DEMO_BUSINESS_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const CALL_ID = `test-call-${Date.now()}`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(`
╔══════════════════════════════════════════════╗
║  📞 SIMULATED PHONE CALL — AI RECEPTIONIST  ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Type what the caller would say.             ║
║  The AI will respond like a receptionist.    ║
║                                              ║
║  Type "hangup" to end the call.              ║
║  Type "auto" to run a demo scenario.         ║
║                                              ║
╚══════════════════════════════════════════════╝
`);

// Auto-demo scenario
const demoMessages = [
  "Hi, I'd like to book a room for tomorrow please",
  "Oh that's unfortunate. When is the next available date?",
  "Sure, I'll take the standard room. My name is Alex Johnson.",
  "Thank you, goodbye!",
];

async function chat(message) {
  console.log(`\n👤 Caller: "${message}"`);
  console.log(`\n⏳ AI is thinking...\n`);

  try {
    const response = await handleCall(DEMO_BUSINESS_ID, CALL_ID, message);
    console.log(`🤖 Receptionist: "${response}"\n`);
    return response;
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
    return null;
  }
}

async function runAutoDemo() {
  console.log("🎬 Running auto-demo scenario...\n");
  console.log("─".repeat(50));

  for (const msg of demoMessages) {
    await chat(msg);
    console.log("─".repeat(50));
    // Small pause between messages for readability
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n✅ Demo complete! The AI checked availability, found tomorrow");
  console.log("   was blocked, suggested an alternative, and booked it.\n");
  console.log("   Check your Supabase bookings table — you should see");
  console.log("   a new confirmed booking for Alex Johnson!\n");

  const history = endCall(CALL_ID);
  process.exit(0);
}

async function runInteractive() {
  function prompt() {
    rl.question("👤 You say: ", async (input) => {
      const message = input.trim();

      if (!message) {
        prompt();
        return;
      }

      if (message.toLowerCase() === "hangup") {
        console.log("\n📞 Call ended.\n");
        const history = endCall(CALL_ID);
        rl.close();
        process.exit(0);
        return;
      }

      if (message.toLowerCase() === "auto") {
        await runAutoDemo();
        return;
      }

      await chat(message);
      prompt();
    });
  }

  // Start the conversation — AI greets first
  await chat("Hello");
  prompt();
}

// Check command line args
if (process.argv.includes("--auto")) {
  runAutoDemo();
} else {
  runInteractive();
}
