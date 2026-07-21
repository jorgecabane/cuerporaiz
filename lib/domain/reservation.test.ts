import { describe, it, expect } from "vitest";
import { canRebookReservation, RESERVATION_STATUS_LABELS } from "./reservation";
import type { ReservationStatus } from "./reservation";

describe("canRebookReservation", () => {
  it("permite re-reservar tras cancelar a tiempo", () => {
    expect(canRebookReservation("CANCELLED")).toBe(true);
  });

  it("permite re-reservar tras cancelar tarde", () => {
    expect(canRebookReservation("LATE_CANCELLED")).toBe(true);
  });

  it("no permite duplicar una reserva vigente", () => {
    expect(canRebookReservation("CONFIRMED")).toBe(false);
  });

  it.each(["ATTENDED", "NO_SHOW"] as const)(
    "no reactiva %s (solo ocurre en clases pasadas)",
    (status) => {
      expect(canRebookReservation(status)).toBe(false);
    }
  );

  // Si se agrega un status nuevo, este test obliga a decidir explícitamente si
  // habilita re-reserva en vez de heredar un default silencioso.
  it("cubre todos los estados conocidos", () => {
    const all = Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[];
    expect(all.sort()).toEqual(
      ["ATTENDED", "CANCELLED", "CONFIRMED", "LATE_CANCELLED", "NO_SHOW"].sort()
    );
    for (const s of all) expect(typeof canRebookReservation(s)).toBe("boolean");
  });
});
