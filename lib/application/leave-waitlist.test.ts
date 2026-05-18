import { describe, it, expect, vi, beforeEach } from "vitest";
import { leaveWaitlistUseCase } from "./leave-waitlist";

const mocks = vi.hoisted(() => ({
  waitlistRepository: {
    findById: vi.fn(),
    updateStatus: vi.fn(),
  },
  eventTicketRepository: {
    findByEventAndUser: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  waitlistRepository: mocks.waitlistRepository,
  eventTicketRepository: mocks.eventTicketRepository,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("leaveWaitlistUseCase", () => {
  it("falla si la entry no existe", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue(null);
    const r = await leaveWaitlistUseCase({ userId: "u1", entryId: "wl_x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("NOT_FOUND");
  });

  it("falla si la entry no es del usuario", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "other",
      status: "QUEUED",
    });
    const r = await leaveWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("FORBIDDEN");
  });

  it("falla si la entry ya está en estado terminal", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "PROMOTED",
    });
    const r = await leaveWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("NOT_ACTIVE");
  });

  it("cancela una entry activa (QUEUED)", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "QUEUED",
      eventId: null,
      liveClassId: "lc_1",
    });
    mocks.waitlistRepository.updateStatus.mockResolvedValue({ id: "wl_1", status: "CANCELLED" });
    const r = await leaveWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(true);
    expect(mocks.waitlistRepository.updateStatus).toHaveBeenCalledWith("wl_1", "CANCELLED");
  });

  it("cancela el ticket PENDING también si la entry está en HELD", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "HELD",
      eventId: "ev_1",
      liveClassId: null,
    });
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue({
      id: "tk_1",
      status: "PENDING",
    });
    mocks.waitlistRepository.updateStatus.mockResolvedValue({ id: "wl_1", status: "CANCELLED" });
    const r = await leaveWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(r.success).toBe(true);
    expect(mocks.eventTicketRepository.updateStatus).toHaveBeenCalledWith("tk_1", "CANCELLED");
  });

  it("no toca el ticket si ya está en estado distinto a PENDING", async () => {
    mocks.waitlistRepository.findById.mockResolvedValue({
      id: "wl_1",
      userId: "u1",
      status: "HELD",
      eventId: "ev_1",
      liveClassId: null,
    });
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue({
      id: "tk_1",
      status: "PAID",
    });
    mocks.waitlistRepository.updateStatus.mockResolvedValue({ id: "wl_1", status: "CANCELLED" });
    await leaveWaitlistUseCase({ userId: "u1", entryId: "wl_1" });
    expect(mocks.eventTicketRepository.updateStatus).not.toHaveBeenCalled();
  });
});
