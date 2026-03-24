import { describe, it, expect } from "vitest";
import { mapMpStatusToSubscription, mapMpStatusToUserPlan } from "./process-subscription-webhook";

describe("mapMpStatusToSubscription", () => {
  it("maps authorized to ACTIVE", () => {
    expect(mapMpStatusToSubscription("authorized")).toBe("ACTIVE");
  });
  it("maps paused to PAUSED", () => {
    expect(mapMpStatusToSubscription("paused")).toBe("PAUSED");
  });
  it("maps cancelled to CANCELLED", () => {
    expect(mapMpStatusToSubscription("cancelled")).toBe("CANCELLED");
  });
  it("maps pending to PENDING", () => {
    expect(mapMpStatusToSubscription("pending")).toBe("PENDING");
  });
});

describe("mapMpStatusToUserPlan", () => {
  it("maps ACTIVE subscription to ACTIVE userPlan", () => {
    expect(mapMpStatusToUserPlan("ACTIVE")).toBe("ACTIVE");
  });
  it("maps PAUSED subscription to FROZEN userPlan", () => {
    expect(mapMpStatusToUserPlan("PAUSED")).toBe("FROZEN");
  });
  it("maps CANCELLED subscription to CANCELLED userPlan", () => {
    expect(mapMpStatusToUserPlan("CANCELLED")).toBe("CANCELLED");
  });
  it("maps PAYMENT_FAILED to FROZEN userPlan", () => {
    expect(mapMpStatusToUserPlan("PAYMENT_FAILED")).toBe("FROZEN");
  });
  it("maps PENDING subscription to ACTIVE userPlan", () => {
    expect(mapMpStatusToUserPlan("PENDING")).toBe("ACTIVE");
  });
});
