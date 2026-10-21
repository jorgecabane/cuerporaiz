import { describe, it, expect } from "vitest";
import { resolveEventEntry, ENTRY_OPENS_MINUTES_BEFORE, type EventEntryInput } from "./event-entry";

const startsAt = new Date("2026-11-01T22:00:00Z");
const endsAt = new Date("2026-11-01T23:30:00Z");
const MIN = 60_000;

function input(overrides: Partial<EventEntryInput> = {}): EventEntryInput {
  return {
    attendee: { revokedAt: null },
    ticketStatus: "PAID",
    event: { status: "PUBLISHED", isOnline: true, meetingUrl: "https://zoom.us/j/1", startsAt, endsAt },
    now: new Date(startsAt.getTime() - 5 * MIN),
    ...overrides,
  };
}

describe("resolveEventEntry", () => {
  it("dentro de la ventana → enter con el link real", () => {
    expect(resolveEventEntry(input())).toEqual({ kind: "enter", meetingUrl: "https://zoom.us/j/1" });
  });

  it("justo al abrir la ventana (10 min antes) → enter", () => {
    const now = new Date(startsAt.getTime() - ENTRY_OPENS_MINUTES_BEFORE * MIN);
    expect(resolveEventEntry(input({ now })).kind).toBe("enter");
  });

  it("un segundo antes de abrir → waiting con opensAt", () => {
    const now = new Date(startsAt.getTime() - ENTRY_OPENS_MINUTES_BEFORE * MIN - 1000);
    expect(resolveEventEntry(input({ now }))).toEqual({
      kind: "waiting",
      opensAt: new Date(startsAt.getTime() - ENTRY_OPENS_MINUTES_BEFORE * MIN),
    });
  });

  it("en endsAt exacto todavía entra; después → ended", () => {
    expect(resolveEventEntry(input({ now: endsAt })).kind).toBe("enter");
    expect(resolveEventEntry(input({ now: new Date(endsAt.getTime() + 1) })).kind).toBe("ended");
  });

  it("token inexistente → invalid", () => {
    expect(resolveEventEntry(input({ attendee: null })).kind).toBe("invalid");
  });

  it("evento inexistente → invalid", () => {
    expect(resolveEventEntry(input({ event: null })).kind).toBe("invalid");
  });

  it("cupo revocado → invalid", () => {
    expect(resolveEventEntry(input({ attendee: { revokedAt: new Date() } })).kind).toBe("invalid");
  });

  it.each(["PENDING", "CANCELLED", "REFUNDED"] as const)("ticket %s → invalid", (ticketStatus) => {
    expect(resolveEventEntry(input({ ticketStatus })).kind).toBe("invalid");
  });

  it("evento desmarcado como online o sin link → invalid", () => {
    const base = input().event!;
    expect(resolveEventEntry(input({ event: { ...base, isOnline: false } })).kind).toBe("invalid");
    expect(resolveEventEntry(input({ event: { ...base, meetingUrl: null } })).kind).toBe("invalid");
  });

  it("evento cancelado → cancelled (aunque el ticket esté cancelado)", () => {
    const base = input().event!;
    expect(
      resolveEventEntry(input({ event: { ...base, status: "CANCELLED" }, ticketStatus: "CANCELLED" })).kind
    ).toBe("cancelled");
  });

  it("la ventana se calcula con la fecha actual del evento (si el admin la mueve)", () => {
    const moved = {
      ...input().event!,
      startsAt: new Date(startsAt.getTime() + 60 * MIN),
      endsAt: new Date(endsAt.getTime() + 60 * MIN),
    };
    expect(resolveEventEntry(input({ event: moved })).kind).toBe("waiting");
  });
});
