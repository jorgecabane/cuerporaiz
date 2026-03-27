import { describe, it, expect, vi, beforeEach } from "vitest";
import { shouldSendEmailPure, shouldSendEmail } from "./check-email-preference";
import type { EmailPreference } from "@/lib/domain/email-preference";

vi.mock("@/lib/adapters/db", () => ({
  emailPreferenceRepository: {
    isEnabled: vi.fn(),
  },
}));

import { emailPreferenceRepository } from "@/lib/adapters/db";

const basePref: EmailPreference = {
  id: "1", userId: "u1", centerId: "c1",
  classReminder: true, spotFreed: true, planExpiring: true,
  reservationConfirm: true, purchaseConfirm: true,
  lessonUnlocked: true, quotaExhausted: true, newContent: true,
  createdAt: new Date(), updatedAt: new Date(),
};

describe("shouldSendEmail (async DB wrapper)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to emailPreferenceRepository.isEnabled and returns its result", async () => {
    vi.mocked(emailPreferenceRepository.isEnabled).mockResolvedValue(true);
    const result = await shouldSendEmail("u1", "c1", "classReminder");
    expect(emailPreferenceRepository.isEnabled).toHaveBeenCalledWith("u1", "c1", "classReminder");
    expect(result).toBe(true);
  });

  it("returns false when repository returns false", async () => {
    vi.mocked(emailPreferenceRepository.isEnabled).mockResolvedValue(false);
    const result = await shouldSendEmail("u2", "c2", "spotFreed");
    expect(result).toBe(false);
  });
});

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
