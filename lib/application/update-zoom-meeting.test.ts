import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/adapters/db", () => ({
  zoomConfigRepository: {
    findByCenterId: vi.fn(),
    upsert: vi.fn(),
  },
}));

import { zoomConfigRepository } from "@/lib/adapters/db";
import { updateZoomMeeting, deleteZoomMeeting } from "./update-zoom-meeting";

describe("updateZoomMeeting", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("hace PATCH al meeting con el nuevo topic", async () => {
    vi.mocked(zoomConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateZoomMeeting("c", "555", { title: "Nuevo" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.zoom.us/v2/meetings/555");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string).topic).toBe("Nuevo");
  });

  it("incluye start_time, duration y timezone cuando se pasan", async () => {
    vi.mocked(zoomConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateZoomMeeting("c", "555", {
      startTime: new Date("2026-08-04T12:30:00Z"),
      durationMinutes: 45,
      timezone: "America/Santiago",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.start_time).toBe("2026-08-04T12:30:00Z");
    expect(body.duration).toBe(45);
    expect(body.timezone).toBe("America/Santiago");
  });

  it("no llama a fetch si no hay params para actualizar", async () => {
    vi.mocked(zoomConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateZoomMeeting("c", "555", {});

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lanza un error claro si Zoom responde con error", async () => {
    vi.mocked(zoomConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "bad" });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(updateZoomMeeting("c", "555", { title: "Nuevo" })).rejects.toThrow(
      "No se pudo actualizar la reunión en Zoom."
    );
  });
});

describe("deleteZoomMeeting", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("hace DELETE al meeting", async () => {
    vi.mocked(zoomConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    global.fetch = fetchMock as unknown as typeof fetch;

    await deleteZoomMeeting("c", "555");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.zoom.us/v2/meetings/555");
    expect(init.method).toBe("DELETE");
  });

  it("no lanza si fetch falla (best-effort)", async () => {
    vi.mocked(zoomConfigRepository.findByCenterId).mockResolvedValue({
      centerId: "c",
      accessToken: "tok",
      refreshToken: null,
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      enabled: true,
    });
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    await expect(deleteZoomMeeting("c", "555")).resolves.toBeUndefined();
  });

  it("no lanza si el centro no tiene Zoom conectado (best-effort)", async () => {
    vi.mocked(zoomConfigRepository.findByCenterId).mockResolvedValue(null);
    global.fetch = vi.fn() as unknown as typeof fetch;

    await expect(deleteZoomMeeting("c", "555")).resolves.toBeUndefined();
  });
});
