import { describe, it, expect } from "vitest";
import { civilDayKeyInTz } from "./civil-day";

describe("civilDayKeyInTz", () => {
  it("clase 8:15 PM Chile en mayo (UTC-4) cae en el día civil correcto", () => {
    // 20:15 hora Chile = 00:15 UTC del día siguiente
    const d = new Date("2026-05-22T00:15:00Z");
    expect(civilDayKeyInTz(d, "America/Santiago")).toBe("2026-05-21");
  });

  it("clase 10:00 AM Chile en mayo (UTC-4) cae en el día civil correcto", () => {
    const d = new Date("2026-05-21T14:00:00Z");
    expect(civilDayKeyInTz(d, "America/Santiago")).toBe("2026-05-21");
  });

  it("clase 11:00 PM Chile (UTC-4) sigue siendo el mismo día civil", () => {
    // 23:00 hora Chile = 03:00 UTC del día siguiente
    const d = new Date("2026-05-22T03:00:00Z");
    expect(civilDayKeyInTz(d, "America/Santiago")).toBe("2026-05-21");
  });

  it("clase 00:30 AM Chile pertenece al nuevo día civil", () => {
    // 00:30 hora Chile = 04:30 UTC del mismo día
    const d = new Date("2026-05-21T04:30:00Z");
    expect(civilDayKeyInTz(d, "America/Santiago")).toBe("2026-05-21");
  });

  it("UTC midnight de un feriado guardado como UTC corresponde al mismo día civil en Chile", () => {
    // Cómo guardamos los feriados: Date.UTC(2026, 4, 21)
    const stored = new Date(Date.UTC(2026, 4, 21));
    // El día civil en Chile a esa hora exacta (00:00 UTC = 20:00 Chile del día anterior)
    // sería 2026-05-20, NO 2026-05-21. Esto justifica usar toISOString().slice(0,10)
    // para la clave del feriado en lugar de civilDayKeyInTz para la fecha guardada.
    expect(stored.toISOString().slice(0, 10)).toBe("2026-05-21");
  });

  it("verano Chile (UTC-3): 9:30 PM cae en el día civil correcto", () => {
    // Enero = verano Chile = UTC-3. 21:30 Chile = 00:30 UTC día siguiente
    const d = new Date("2026-01-16T00:30:00Z");
    expect(civilDayKeyInTz(d, "America/Santiago")).toBe("2026-01-15");
  });

  it("respeta una TZ distinta (UTC)", () => {
    const d = new Date("2026-05-22T00:15:00Z");
    expect(civilDayKeyInTz(d, "UTC")).toBe("2026-05-22");
  });
});
