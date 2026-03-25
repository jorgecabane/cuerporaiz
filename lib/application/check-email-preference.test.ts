import { describe, it, expect } from "vitest";
import { shouldSendEmailPure } from "./check-email-preference";
import type { EmailPreference } from "@/lib/domain/email-preference";

const basePref: EmailPreference = {
  id: "1", userId: "u1", centerId: "c1",
  classReminder: true, spotFreed: true, planExpiring: true,
  reservationConfirm: true, purchaseConfirm: true,
  createdAt: new Date(), updatedAt: new Date(),
};

describe("shouldSendEmailPure", () => {
  it("returns true when no preference record exists (null)", () => {
    expect(shouldSendEmailPure(null, "classReminder")).toBe(true);
  });

  it("returns true when preference is enabled", () => {
    expect(shouldSendEmailPure(basePref, "classReminder")).toBe(true);
  });

  it("returns false when preference is disabled", () => {
    const pref = { ...basePref, classReminder: false };
    expect(shouldSendEmailPure(pref, "classReminder")).toBe(false);
  });

  it("checks correct field for each type", () => {
    const pref = { ...basePref, spotFreed: false, planExpiring: true };
    expect(shouldSendEmailPure(pref, "spotFreed")).toBe(false);
    expect(shouldSendEmailPure(pref, "planExpiring")).toBe(true);
  });
});
