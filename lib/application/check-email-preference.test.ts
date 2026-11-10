import { describe, it, expect, vi, beforeEach } from "vitest";
import { shouldSendEmail } from "./check-email-preference";

vi.mock("@/lib/adapters/db", () => ({
  emailPreferenceRepository: {
    isEnabled: vi.fn(),
  },
}));

import { emailPreferenceRepository } from "@/lib/adapters/db";

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
