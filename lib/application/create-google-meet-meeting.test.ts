import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/adapters/db", () => ({
  googleMeetConfigRepository: {
    findByCenterId: vi.fn(),
    upsert: vi.fn(),
  },
}));

import { googleMeetConfigRepository } from "@/lib/adapters/db";
import { createGoogleMeetMeeting } from "./create-google-meet-meeting";

describe("createGoogleMeetMeeting", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("devuelve joinUrl y externalId (id del evento)", async () => {
    vi.mocked(googleMeetConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "center-1",
      accessToken: "tok",
      refreshToken: "r",
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "evt_123", hangoutLink: "https://meet.google.com/abc" }),
    }) as unknown as typeof fetch;

    const res = await createGoogleMeetMeeting("center-1", {
      title: "Yoga", startTime: new Date("2026-08-04T12:30:00Z"), durationMinutes: 60,
    });
    expect(res.joinUrl).toBe("https://meet.google.com/abc");
    expect(res.externalId).toBe("evt_123");
  });
});
