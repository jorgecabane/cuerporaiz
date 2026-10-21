import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureEventAttendees, ensureSeatsForEvent } from "./ensure-event-attendees";

const mocks = vi.hoisted(() => ({
  eventAttendeeRepository: { createMissingSeats: vi.fn(), findByTicketId: vi.fn() },
  eventTicketRepository: { findByEventId: vi.fn() },
}));
vi.mock("@/lib/adapters/db", () => ({
  eventAttendeeRepository: mocks.eventAttendeeRepository,
  eventTicketRepository: mocks.eventTicketRepository,
}));

describe("ensureEventAttendees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventAttendeeRepository.findByTicketId.mockResolvedValue([{ id: "a1", seat: 1 }]);
  });

  it("evento online: completa hasta quantity y devuelve los cupos", async () => {
    const result = await ensureEventAttendees({ id: "t1", quantity: 3 }, { isOnline: true });
    expect(mocks.eventAttendeeRepository.createMissingSeats).toHaveBeenCalledWith("t1", 3);
    expect(result).toEqual([{ id: "a1", seat: 1 }]);
  });

  it("evento presencial: no hace nada", async () => {
    expect(await ensureEventAttendees({ id: "t1", quantity: 3 }, { isOnline: false })).toEqual([]);
    expect(mocks.eventAttendeeRepository.createMissingSeats).not.toHaveBeenCalled();
  });
});

describe("ensureSeatsForEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea los cupos faltantes sólo de los tickets PAID (compras previas a pasar a online)", async () => {
    mocks.eventTicketRepository.findByEventId.mockResolvedValue([
      { id: "t1", quantity: 2, status: "PAID" },
      { id: "t2", quantity: 1, status: "PENDING" },
      { id: "t3", quantity: 3, status: "PAID" },
    ]);
    await ensureSeatsForEvent("e1");
    expect(mocks.eventAttendeeRepository.createMissingSeats.mock.calls).toEqual([
      ["t1", 2],
      ["t3", 3],
    ]);
  });
});
