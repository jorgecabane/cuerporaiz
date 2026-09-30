import { describe, it, expect } from "vitest";
import { summarizeScheduleByDiscipline } from "./class-schedule-summary";

const TZ = "America/Santiago"; // UTC-3 en septiembre

describe("summarizeScheduleByDiscipline", () => {
  it("agrupa días por hora, lunes primero, en la TZ del centro", () => {
    const result = summarizeScheduleByDiscipline(
      [
        { disciplineId: "vin", startsAt: new Date("2026-09-30T11:00:00Z") }, // mié 08:00
        { disciplineId: "vin", startsAt: new Date("2026-09-28T11:00:00Z") }, // lun 08:00
        { disciplineId: "vin", startsAt: new Date("2026-10-01T23:00:00Z") }, // jue 20:00
        { disciplineId: "yin", startsAt: new Date("2026-09-28T23:00:00Z") }, // lun 20:00
        { disciplineId: null, startsAt: new Date("2026-09-28T23:00:00Z") },
      ],
      TZ
    );
    expect(result.get("vin")).toBe("Lunes y miércoles 08:00 · Jueves 20:00");
    expect(result.get("yin")).toBe("Lunes 20:00");
    expect(result.size).toBe(2);
  });

  it("no repite días de la misma semana y usa la hora local (no UTC)", () => {
    const result = summarizeScheduleByDiscipline(
      [
        { disciplineId: "d", startsAt: new Date("2026-09-29T02:30:00Z") }, // lun 23:30 en Santiago
        { disciplineId: "d", startsAt: new Date("2026-10-06T02:30:00Z") }, // lun siguiente
      ],
      TZ
    );
    expect(result.get("d")).toBe("Lunes 23:30");
  });
});
