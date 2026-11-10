import { describe, it, expect } from "vitest";
import { localYmdFromDate } from "./local-ymd";

/** Lo que hacían las copias en los calendarios del panel (formatDateKey / formatDateParam). */
function legacyDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("localYmdFromDate", () => {
  it("día civil local con ceros a la izquierda", () => {
    expect(localYmdFromDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("igual a las copias de los calendarios en bordes de mes, año y medianoche", () => {
    for (const d of [new Date(2026, 11, 31, 23, 59), new Date(2027, 0, 1, 0, 0), new Date(2026, 1, 28, 12), new Date(2026, 8, 6, 0, 30)]) {
      expect(localYmdFromDate(d)).toBe(legacyDateKey(d));
    }
  });
});
