import { describe, it } from "node:test";
import assert from "node:assert";
import { validateToolParams } from "../src/middleware/validate.js";

describe("Tool Handlers", () => {
  it("should have tool definitions for all 8 tools", async () => {
    const { default: tools } = await import("../tools/definitions.js");
    assert.strictEqual(tools.length, 8);

    const names = tools.map((t) => t.name);
    assert.ok(names.includes("check_availability"));
    assert.ok(names.includes("find_next_available"));
    assert.ok(names.includes("book_room"));
    assert.ok(names.includes("cancel_booking"));
    assert.ok(names.includes("modify_booking"));
    assert.ok(names.includes("get_business_info"));
    assert.ok(names.includes("transfer_to_human"));
    assert.ok(names.includes("send_confirmation"));
  });

  it("should validate check_availability rejects bad params", () => {
    const errors = validateToolParams("check_availability", {
      check_in: "bad-date",
    });
    assert.ok(errors);
    assert.ok(errors.some((e) => e.includes("check_in")));
  });

  it("should validate book_room requires UUID resource_id", () => {
    const errors = validateToolParams("book_room", {
      resource_id: "not-uuid",
      check_in: "2026-04-01",
      check_out: "2026-04-03",
      guest_name: "Test",
    });
    assert.ok(errors);
    assert.ok(errors.some((e) => e.includes("resource_id")));
  });

  it("should validate transfer_to_human requires reason", () => {
    const errors = validateToolParams("transfer_to_human", {});
    assert.ok(errors);
    assert.ok(errors.some((e) => e.includes("reason")));
  });

  it("should validate get_business_info requires valid question_type", () => {
    const errors = validateToolParams("get_business_info", {
      question_type: "invalid",
    });
    assert.ok(errors);

    const valid = validateToolParams("get_business_info", {
      question_type: "amenities",
    });
    assert.strictEqual(valid, null);
  });

  it("should validate send_confirmation requires booking_id and phone", () => {
    const errors = validateToolParams("send_confirmation", {});
    assert.ok(errors);
    assert.ok(errors.length >= 2);
  });

  it("should return null for unknown tool names (no validation rules)", () => {
    const errors = validateToolParams("unknown_tool", { foo: "bar" });
    assert.strictEqual(errors, null);
  });

  it("should have valid input_schema for each tool definition", async () => {
    const { default: tools } = await import("../tools/definitions.js");
    for (const tool of tools) {
      assert.ok(tool.name, "tool must have a name");
      assert.ok(tool.description, "tool must have a description");
      assert.ok(tool.input_schema, "tool must have input_schema");
      assert.strictEqual(tool.input_schema.type, "object");
      assert.ok(tool.input_schema.properties, "input_schema must have properties");
    }
  });
});
