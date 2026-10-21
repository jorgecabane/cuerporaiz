import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureEventAttendees } from "./ensure-event-attendees";

const mocks = vi.hoisted(() => ({
  eventAttendeeRepository: { createMissingSeats: vi.fn(), findByTicketId: vi.fn() },
}));
vi.mock("@/lib/adapters/db", () => ({ eventAttendeeRepository: mocks.eventAttendeeRepository }));

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
