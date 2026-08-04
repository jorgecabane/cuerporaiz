import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/adapters/db", () => ({
  googleMeetConfigRepository: {
    findByCenterId: vi.fn(),
    upsert: vi.fn(),
  },
}));

import { googleMeetConfigRepository } from "@/lib/adapters/db";
import { updateGoogleMeetMeeting, deleteGoogleMeetMeeting } from "./update-google-meet-meeting";

describe("updateGoogleMeetMeeting", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("hace PATCH al evento con el nuevo summary", async () => {
    vi.mocked(googleMeetConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateGoogleMeetMeeting("c", "evt_555", { title: "Nuevo" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/evt_555?conferenceDataVersion=1"
    );
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string).summary).toBe("Nuevo");
  });

  it("incluye start/end con timeZone cuando se pasan startTime y durationMinutes", async () => {
    vi.mocked(googleMeetConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateGoogleMeetMeeting("c", "evt_555", {
      startTime: new Date("2026-08-04T12:30:00Z"),
      durationMinutes: 45,
      timezone: "America/Santiago",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.start.dateTime).toBe("2026-08-04T12:30:00.000Z");
    expect(body.start.timeZone).toBe("America/Santiago");
    expect(body.end.dateTime).toBe("2026-08-04T13:15:00.000Z");
    expect(body.end.timeZone).toBe("America/Santiago");
  });

  it("no llama a fetch si no hay params para actualizar", async () => {
    vi.mocked(googleMeetConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateGoogleMeetMeeting("c", "evt_555", {});

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lanza un error claro si Google responde con error", async () => {
    vi.mocked(googleMeetConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "bad" });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(updateGoogleMeetMeeting("c", "evt_555", { title: "Nuevo" })).rejects.toThrow(
      "No se pudo actualizar la reunión en Google Meet."
    );
  });
});

describe("deleteGoogleMeetMeeting", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("hace DELETE al evento", async () => {
    vi.mocked(googleMeetConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    global.fetch = fetchMock as unknown as typeof fetch;

    await deleteGoogleMeetMeeting("c", "evt_555");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events/evt_555");
    expect(init.method).toBe("DELETE");
  });

  it("no lanza si fetch falla (best-effort)", async () => {
    vi.mocked(googleMeetConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    await expect(deleteGoogleMeetMeeting("c", "evt_555")).resolves.toBeUndefined();
  });

  it("no lanza si el centro no tiene Google Meet conectado (best-effort)", async () => {
    vi.mocked(googleMeetConfigRepository.findByCenterId).mockResolvedValue(null);
    global.fetch = vi.fn() as unknown as typeof fetch;

    await expect(deleteGoogleMeetMeeting("c", "evt_555")).resolves.toBeUndefined();
  });
});
