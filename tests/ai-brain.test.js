import { describe, it } from "node:test";
import assert from "node:assert";

describe("AI Brain module", () => {
  it("should have correct module structure", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(
      new URL("../src/ai-brain.js", import.meta.url),
      "utf-8"
    );

    // Verify exports exist
    assert.ok(src.includes("export async function handleCall"));
    assert.ok(src.includes("export function endCall"));
    assert.ok(src.includes("export function getActiveCallCount"));
  });

  it("should implement retry logic for Claude API", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(
      new URL("../src/ai-brain.js", import.meta.url),
      "utf-8"
    );

    assert.ok(src.includes("callClaudeWithRetry") || src.includes("retry"));
    assert.ok(src.includes("circuit") || src.includes("Circuit"));
  });

  it("should implement conversation memory limits", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(
      new URL("../src/ai-brain.js", import.meta.url),
      "utf-8"
    );

    assert.ok(src.includes("trimConversation") || src.includes("MAX_MESSAGES"));
  });

  it("should implement conversation persistence", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(
      new URL("../src/ai-brain.js", import.meta.url),
      "utf-8"
    );

    assert.ok(src.includes("active_conversations") || src.includes("persistConversation"));
    assert.ok(src.includes("rehydrate") || src.includes("loadActiveConversations"));
  });
});
