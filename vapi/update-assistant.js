import dotenv from "dotenv";
dotenv.config();

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;

if (!VAPI_API_KEY || !ASSISTANT_ID) {
  console.error("❌ Missing VAPI_API_KEY or VAPI_ASSISTANT_ID in .env");
  process.exit(1);
}

const patch = {
  voice: {
    provider: "openai",
    voiceId: "alloy",
    model: "tts-1",
  },
  transcriber: {
    provider: "gladia",
    model: "fast",
    language: "sq",
  },
};

async function updateAssistant() {
  const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ Failed:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("✅ Assistant updated!");
  console.log("   Voice:", data.voice?.provider, data.voice?.voiceId);
  console.log("   Transcriber:", data.transcriber?.provider, data.transcriber?.language);
}

updateAssistant();
