import { describe, it } from "node:test";
import assert from "node:assert";

describe("Server module", () => {
  it("should have correct package.json structure", async () => {
    const { readFile } = await import("node:fs/promises");
    const pkg = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf-8")
    );

    assert.strictEqual(pkg.type, "module");
    assert.ok(pkg.scripts.start);
    assert.ok(pkg.scripts.dev);
    assert.ok(pkg.scripts.test);
    assert.ok(pkg.dependencies.express);
    assert.ok(pkg.dependencies.cors);
    assert.ok(pkg.dependencies.helmet);
  });

  it("should have required config environment validation", async () => {
    // Config module exists and exports a frozen object
    const { readFile } = await import("node:fs/promises");
    const configSrc = await readFile(
      new URL("../src/config.js", import.meta.url),
      "utf-8"
    );

    assert.ok(configSrc.includes("Object.freeze"));
    assert.ok(configSrc.includes("SUPABASE_URL"));
    assert.ok(configSrc.includes("ANTHROPIC_API_KEY"));
    assert.ok(configSrc.includes("process.exit(1)"));
  });

  it("should have security middleware configured", async () => {
    const { readFile } = await import("node:fs/promises");
    const serverSrc = await readFile(
      new URL("../src/server.js", import.meta.url),
      "utf-8"
    );

    assert.ok(serverSrc.includes("helmet()"));
    assert.ok(serverSrc.includes("cors("));
    assert.ok(serverSrc.includes('disable("x-powered-by")'));
    assert.ok(serverSrc.includes("apiKeyAuth"));
    assert.ok(serverSrc.includes("rateLimitChat") || serverSrc.includes("chatRateLimit"));
  });
});
