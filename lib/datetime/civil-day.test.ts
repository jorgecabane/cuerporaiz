import { describe, it, expect } from "vitest";
import {
  civilDateTimeInTzToUtc,
  civilDayKeyInTz,
  civilDayOfWeekInTz,
  civilHourMinuteInTz,
  civilYearMonthDayInTz,
} from "./civil-day";

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

describe("civilDayOfWeekInTz", () => {
  it("Mié 20:00 Chile (UTC-4) → civilDow=3 (Wed), no 4 (Thu UTC)", () => {
    // 2026-06-03 20:00 Chile = 2026-06-04 00:00 UTC (Jueves UTC)
    const d = new Date("2026-06-04T00:00:00Z");
    expect(civilDayOfWeekInTz(d, "America/Santiago")).toBe(3);
    // sanity: UTC dice 4 (Jueves)
    expect(d.getUTCDay()).toBe(4);
  });

  it("Vie 20:00 Chile → civilDow=5 (Fri), no 6 (Sat UTC)", () => {
    // 2026-06-05 20:00 Chile = 2026-06-06 00:00 UTC (Sábado UTC)
    const d = new Date("2026-06-06T00:00:00Z");
    expect(civilDayOfWeekInTz(d, "America/Santiago")).toBe(5);
    expect(d.getUTCDay()).toBe(6);
  });

  it("Dom 10:00 Chile mismo día UTC → civilDow=0", () => {
    const d = new Date("2026-06-07T14:00:00Z");
    expect(civilDayOfWeekInTz(d, "America/Santiago")).toBe(0);
  });

  it("verano Chile (UTC-3): 22:00 Sáb cae Sáb civil", () => {
    // Enero. 22:00 Sáb Chile = 01:00 Dom UTC
    const d = new Date("2026-01-11T01:00:00Z");
    expect(civilDayOfWeekInTz(d, "America/Santiago")).toBe(6);
    expect(d.getUTCDay()).toBe(0);
  });

  it("UTC TZ → coincide con getUTCDay()", () => {
    const d = new Date("2026-06-04T00:00:00Z");
    expect(civilDayOfWeekInTz(d, "UTC")).toBe(d.getUTCDay());
  });
});

describe("civilHourMinuteInTz", () => {
  it("20:00 Chile invierno (UTC-4) sacado de 00:00 UTC del día siguiente", () => {
    const d = new Date("2026-07-09T00:00:00Z");
    expect(civilHourMinuteInTz(d, "America/Santiago")).toEqual({ hour: 20, minute: 0 });
  });

  it("20:00 Chile verano (UTC-3) sacado de 23:00 UTC mismo día", () => {
    const d = new Date("2026-03-25T23:00:00Z");
    expect(civilHourMinuteInTz(d, "America/Santiago")).toEqual({ hour: 20, minute: 0 });
  });

  it("UTC TZ devuelve hora UTC tal cual", () => {
    const d = new Date("2026-07-09T15:30:00Z");
    expect(civilHourMinuteInTz(d, "UTC")).toEqual({ hour: 15, minute: 30 });
  });
});

describe("civilYearMonthDayInTz", () => {
  it("23:00 Chile invierno (UTC-4) = 03:00 UTC día siguiente → día civil correcto", () => {
    const d = new Date("2026-07-09T03:00:00Z");
    expect(civilYearMonthDayInTz(d, "America/Santiago")).toEqual({
      year: 2026,
      month: 7,
      day: 8,
    });
  });
});

describe("civilDateTimeInTzToUtc", () => {
  it("Chile invierno (UTC-4): 20:00 civil → 00:00 UTC día siguiente", () => {
    const utc = civilDateTimeInTzToUtc(2026, 7, 8, 20, 0, "America/Santiago");
    expect(utc.toISOString()).toBe("2026-07-09T00:00:00.000Z");
  });

  it("Chile verano (UTC-3): 20:00 civil → 23:00 UTC mismo día", () => {
    const utc = civilDateTimeInTzToUtc(2026, 3, 25, 20, 0, "America/Santiago");
    expect(utc.toISOString()).toBe("2026-03-25T23:00:00.000Z");
  });

  it("Roundtrip Chile: civilDateTimeInTzToUtc ∘ civilHourMinuteInTz = identity (invierno)", () => {
    const original = new Date("2026-07-09T00:00:00Z");
    const civil = civilHourMinuteInTz(original, "America/Santiago");
    const civilDate = civilYearMonthDayInTz(original, "America/Santiago");
    const reconstructed = civilDateTimeInTzToUtc(
      civilDate.year,
      civilDate.month,
      civilDate.day,
      civil.hour,
      civil.minute,
      "America/Santiago",
    );
    expect(reconstructed.toISOString()).toBe(original.toISOString());
  });

  it("DST: clases a 20:00 Chile antes/después de transición de abril mantienen hora civil", () => {
    // 25-marzo verano (UTC-3): 20:00 Chile = 23:00 UTC
    const beforeDst = civilDateTimeInTzToUtc(2026, 3, 25, 20, 0, "America/Santiago");
    expect(beforeDst.toISOString()).toBe("2026-03-25T23:00:00.000Z");

    // 8-abril invierno (UTC-4): 20:00 Chile = 00:00 UTC día siguiente
    const afterDst = civilDateTimeInTzToUtc(2026, 4, 8, 20, 0, "America/Santiago");
    expect(afterDst.toISOString()).toBe("2026-04-09T00:00:00.000Z");

    // Ambos deben mostrar 20:00 al re-extraer la hora civil.
    expect(civilHourMinuteInTz(beforeDst, "America/Santiago").hour).toBe(20);
    expect(civilHourMinuteInTz(afterDst, "America/Santiago").hour).toBe(20);
  });

  it("DST: clases a 20:00 Chile antes/después de transición de septiembre mantienen hora civil", () => {
    // 26-agosto invierno (UTC-4)
    const beforeDst = civilDateTimeInTzToUtc(2026, 8, 26, 20, 0, "America/Santiago");
    expect(beforeDst.toISOString()).toBe("2026-08-27T00:00:00.000Z");

    // 9-septiembre verano (UTC-3) — después del 6/9 transition
    const afterDst = civilDateTimeInTzToUtc(2026, 9, 9, 20, 0, "America/Santiago");
    expect(afterDst.toISOString()).toBe("2026-09-09T23:00:00.000Z");

    expect(civilHourMinuteInTz(beforeDst, "America/Santiago").hour).toBe(20);
    expect(civilHourMinuteInTz(afterDst, "America/Santiago").hour).toBe(20);
  });
});
