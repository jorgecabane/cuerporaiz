import { describe, it, expect } from "vitest";
import { computeSubscriptionAmount } from "./subscription-checkout";

describe("computeSubscriptionAmount", () => {
  it("applies recurring discount", () => {
    expect(computeSubscriptionAmount(10000, 15)).toBe(8500);
  });

  it("returns original when no discount", () => {
    expect(computeSubscriptionAmount(10000, 0)).toBe(10000);
  });

  it("returns original when discount is null", () => {
    expect(computeSubscriptionAmount(10000, null)).toBe(10000);
  });

  it("handles 100% discount", () => {
    expect(computeSubscriptionAmount(10000, 100)).toBe(0);
  });
});
