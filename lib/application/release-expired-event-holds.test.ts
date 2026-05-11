import { describe, it, expect, vi, beforeEach } from "vitest";
import { releaseExpiredEventHolds } from "./release-expired-event-holds";

const mocks = vi.hoisted(() => ({
  waitlistRepository: {
    expireEventHolds: vi.fn(),
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  waitlistRepository: mocks.waitlistRepository,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("releaseExpiredEventHolds", () => {
  it("delega al repositorio con eventId y now", async () => {
    mocks.waitlistRepository.expireEventHolds.mockResolvedValue(["wl_1", "wl_2"]);
    const ids = await releaseExpiredEventHolds("ev_1");
    expect(ids).toEqual(["wl_1", "wl_2"]);
    expect(mocks.waitlistRepository.expireEventHolds).toHaveBeenCalledTimes(1);
    const [eventIdArg, nowArg] = mocks.waitlistRepository.expireEventHolds.mock.calls[0];
    expect(eventIdArg).toBe("ev_1");
    expect(nowArg).toBeInstanceOf(Date);
  });

  it("acepta override de now (útil para tests / lazy evaluation)", async () => {
    mocks.waitlistRepository.expireEventHolds.mockResolvedValue([]);
    const fixedNow = new Date("2026-05-10T12:00:00Z");
    await releaseExpiredEventHolds("ev_1", fixedNow);
    expect(mocks.waitlistRepository.expireEventHolds).toHaveBeenCalledWith(
      "ev_1",
      fixedNow
    );
  });

  it("retorna [] cuando no hay nada que expirar", async () => {
    mocks.waitlistRepository.expireEventHolds.mockResolvedValue([]);
    const ids = await releaseExpiredEventHolds("ev_1");
    expect(ids).toEqual([]);
  });
});
