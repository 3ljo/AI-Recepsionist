import { describe, it } from "node:test";
import assert from "node:assert";
import { validateToolParams } from "../src/middleware/validate.js";

describe("validateToolParams", () => {
  describe("check_availability", () => {
    it("passes with valid check_in", () => {
      const errors = validateToolParams("check_availability", {
        check_in: "2026-04-01",
      });
      assert.strictEqual(errors, null);
    });

    it("fails with invalid check_in", () => {
      const errors = validateToolParams("check_availability", {
        check_in: "not-a-date",
      });
      assert.ok(errors);
      assert.ok(errors.some((e) => e.includes("check_in")));
    });

    it("fails with missing check_in", () => {
      const errors = validateToolParams("check_availability", {});
      assert.ok(errors);
    });

    it("fails with invalid guest_count", () => {
      const errors = validateToolParams("check_availability", {
        check_in: "2026-04-01",
        guest_count: 25,
      });
      assert.ok(errors);
      assert.ok(errors.some((e) => e.includes("guest_count")));
    });

    it("passes with valid guest_count", () => {
      const errors = validateToolParams("check_availability", {
        check_in: "2026-04-01",
        guest_count: 5,
      });
      assert.strictEqual(errors, null);
    });
  });

  describe("book_room", () => {
    it("passes with all required fields", () => {
      const errors = validateToolParams("book_room", {
        resource_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        check_in: "2026-04-01",
        check_out: "2026-04-03",
        guest_name: "John Doe",
      });
      assert.strictEqual(errors, null);
    });

    it("fails with invalid resource_id", () => {
      const errors = validateToolParams("book_room", {
        resource_id: "not-a-uuid",
        check_in: "2026-04-01",
        check_out: "2026-04-03",
        guest_name: "John Doe",
      });
      assert.ok(errors);
      assert.ok(errors.some((e) => e.includes("resource_id")));
    });

    it("fails with missing guest_name", () => {
      const errors = validateToolParams("book_room", {
        resource_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        check_in: "2026-04-01",
        check_out: "2026-04-03",
      });
      assert.ok(errors);
      assert.ok(errors.some((e) => e.includes("guest_name")));
    });
  });

  describe("cancel_booking", () => {
    it("passes with guest_name", () => {
      const errors = validateToolParams("cancel_booking", {
        guest_name: "John Doe",
      });
      assert.strictEqual(errors, null);
    });

    it("passes with guest_phone", () => {
      const errors = validateToolParams("cancel_booking", {
        guest_phone: "+1234567890",
      });
      assert.strictEqual(errors, null);
    });

    it("fails with neither name nor phone", () => {
      const errors = validateToolParams("cancel_booking", {});
      assert.ok(errors);
    });
  });

  describe("find_next_available", () => {
    it("passes with valid from_date", () => {
      const errors = validateToolParams("find_next_available", {
        from_date: "2026-04-01",
      });
      assert.strictEqual(errors, null);
    });

    it("fails with invalid from_date", () => {
      const errors = validateToolParams("find_next_available", {
        from_date: "April 1st",
      });
      assert.ok(errors);
    });
  });

  describe("modify_booking", () => {
    it("passes with guest_name and new dates", () => {
      const errors = validateToolParams("modify_booking", {
        guest_name: "John Doe",
        new_check_in: "2026-04-05",
        new_check_out: "2026-04-07",
      });
      assert.strictEqual(errors, null);
    });

    it("fails with invalid new dates", () => {
      const errors = validateToolParams("modify_booking", {
        guest_name: "John",
        new_check_in: "bad-date",
      });
      assert.ok(errors);
    });

    it("fails with no identifier", () => {
      const errors = validateToolParams("modify_booking", {
        new_check_in: "2026-04-05",
      });
      assert.ok(errors);
    });
  });
});
