import { describe, it, expect } from "vitest";
import {
  isSubscriptionActive,
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionStatus,
} from "./subscription";

describe("isSubscriptionActive", () => {
  it("returns true for ACTIVE status", () => {
    expect(isSubscriptionActive("ACTIVE")).toBe(true);
  });

  it("returns false for PAUSED status", () => {
    expect(isSubscriptionActive("PAUSED")).toBe(false);
  });

  it("returns false for CANCELLED status", () => {
    expect(isSubscriptionActive("CANCELLED")).toBe(false);
  });

  it("returns false for PAYMENT_FAILED status", () => {
    expect(isSubscriptionActive("PAYMENT_FAILED")).toBe(false);
  });

  it("returns false for PENDING status", () => {
    expect(isSubscriptionActive("PENDING")).toBe(false);
  });
});

describe("SUBSCRIPTION_STATUS_LABELS", () => {
  it("has labels for all statuses", () => {
    const statuses: SubscriptionStatus[] = ["PENDING", "ACTIVE", "PAUSED", "CANCELLED", "PAYMENT_FAILED"];
    for (const s of statuses) {
      expect(SUBSCRIPTION_STATUS_LABELS[s]).toBeDefined();
      expect(typeof SUBSCRIPTION_STATUS_LABELS[s]).toBe("string");
    }
  });
});
