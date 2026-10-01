import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/adapters/db", () => ({
  zoomConfigRepository: {
    findByCenterId: vi.fn(),
    upsert: vi.fn(),
  },
}));

import { zoomConfigRepository } from "@/lib/adapters/db";
import { createZoomMeeting } from "./create-zoom-meeting";

describe("createZoomMeeting", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("devuelve joinUrl y externalId (id de la reunión)", async () => {
    vi.mocked(zoomConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "center-1",
      accessToken: "tok",
      refreshToken: "r",
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 8231409562, join_url: "https://zoom.us/j/8231409562" }),
    }) as unknown as typeof fetch;

    const res = await createZoomMeeting("center-1", {
      title: "Yoga", startTime: new Date("2026-08-04T12:30:00Z"), durationMinutes: 60,
    });
    expect(res.joinUrl).toBe("https://zoom.us/j/8231409562");
    expect(res.externalId).toBe("8231409562");
  });

  it("usa type 3 cuando recurring=true", async () => {
    vi.mocked(zoomConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1, join_url: "u" }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    await createZoomMeeting("c", { title: "T", startTime: new Date(), durationMinutes: 60, recurring: true });
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(requestInit.body as string);
    expect(body.type).toBe(3);
  });
});
