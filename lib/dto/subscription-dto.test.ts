import { describe, it, expect } from "vitest";
import {
  createSubscriptionBodySchema,
  cancelSubscriptionBodySchema,
} from "./subscription-dto";

describe("subscription-dto schemas", () => {
  describe("createSubscriptionBodySchema", () => {
    it("accepts valid input with planId", () => {
      const result = createSubscriptionBodySchema.safeParse({
        planId: "clx1234567890abcdef12345",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing planId", () => {
      const result = createSubscriptionBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects empty planId", () => {
      const result = createSubscriptionBodySchema.safeParse({
        planId: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects null planId", () => {
      const result = createSubscriptionBodySchema.safeParse({
        planId: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cancelSubscriptionBodySchema", () => {
    it("accepts valid subscriptionId", () => {
      const result = cancelSubscriptionBodySchema.safeParse({
        subscriptionId: "clx1234567890abcdef12345",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing subscriptionId", () => {
      const result = cancelSubscriptionBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects empty subscriptionId", () => {
      const result = cancelSubscriptionBodySchema.safeParse({
        subscriptionId: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects null subscriptionId", () => {
      const result = cancelSubscriptionBodySchema.safeParse({
        subscriptionId: null,
      });
      expect(result.success).toBe(false);
    });
  });
});
