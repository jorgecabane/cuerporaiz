import { describe, it, expect } from "vitest";
import { generateSeriesInstances } from "./generate-series-instances";
import type { LiveClassSeries } from "@/lib/domain";

function makeSeries(overrides: Partial<LiveClassSeries> = {}): LiveClassSeries {
  return {
    id: "series-1",
    centerId: "center-1",
    title: "Yoga",
    disciplineId: null,
    instructorId: null,
    maxCapacity: 20,
    durationMinutes: 60,
    isOnline: false,
    meetingUrl: null,
    acceptsTrialReservations: false,
    trialCapacity: null,
    color: null,
    classPassEnabled: false,
    classPassCapacity: null,
    repeatFrequency: "WEEKLY",
    repeatOnDaysOfWeek: [1, 3, 5], // mon, wed, fri
    repeatEveryN: 1,
    startsAt: new Date("2026-06-01T14:00:00Z"), // Monday
    endsAt: new Date("2026-06-30T14:00:00Z"),
    repeatCount: null,
    monthlyMode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("generateSeriesInstances — holidays", () => {
  it("excluye fechas marcadas como feriado (WEEKLY)", () => {
    const series = makeSeries();
    const holidayDates = new Set(["2026-06-03", "2026-06-05"]);

    const withoutHolidays = generateSeriesInstances(series);
    const withHolidays = generateSeriesInstances(series, holidayDates);

    expect(withHolidays.length).toBe(withoutHolidays.length - 2);
    const keys = withHolidays.map((i) => i.startsAt.toISOString().slice(0, 10));
    expect(keys).not.toContain("2026-06-03");
    expect(keys).not.toContain("2026-06-05");
  });

  it("no excluye si el set de feriados está vacío", () => {
    const series = makeSeries();
    const baseline = generateSeriesInstances(series);
    const withEmptySet = generateSeriesInstances(series, new Set());
    expect(withEmptySet.length).toBe(baseline.length);
  });

  it("excluye en DAILY también", () => {
    const series = makeSeries({
      repeatFrequency: "DAILY",
      repeatOnDaysOfWeek: [],
      startsAt: new Date("2026-06-01T14:00:00Z"),
      endsAt: new Date("2026-06-07T14:00:00Z"),
    });
    const holidayDates = new Set(["2026-06-03"]);

    const instances = generateSeriesInstances(series, holidayDates);
    const keys = instances.map((i) => i.startsAt.toISOString().slice(0, 10));

    expect(keys).not.toContain("2026-06-03");
    expect(keys).toContain("2026-06-02");
    expect(keys).toContain("2026-06-04");
  });

  it("DAILY: con TZ del centro excluye clase nocturna cuyo UTC cae al día siguiente", () => {
    // Clase 20:15 Chile (UTC-4 en junio) = 00:15 UTC del día siguiente.
    // Sin la TZ, el dateKey por UTC sería "2026-06-04" y NO matchearía el feriado.
    const series = makeSeries({
      repeatFrequency: "DAILY",
      repeatOnDaysOfWeek: [],
      startsAt: new Date("2026-06-02T00:15:00Z"), // 20:15 Chile 2026-06-01
      endsAt: new Date("2026-06-07T00:15:00Z"),
    });
    const holidayDates = new Set(["2026-06-03"]);

    const withTz = generateSeriesInstances(series, holidayDates, "America/Santiago");
    const civilDays = withTz.map((i) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(i.startsAt)
    );
    expect(civilDays).not.toContain("2026-06-03");
    expect(civilDays).toContain("2026-06-02");
    expect(civilDays).toContain("2026-06-04");
  });
});

describe("generateSeriesInstances — WEEKLY con timezone (regresión bug día civil)", () => {
  // Formatter helper para sacar el día civil de cada instancia.
  const fmtDay = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const fmtDow = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santiago",
      weekday: "short",
    }).format(d);

  it("Mié 20:00 Chile + repeats Mié/Jue/Vie → cada semana cae Mié/Jue/Vie civiles (no Mar/Mié/Jue)", () => {
    // startsAt = 2026-06-03 20:00 Chile (Mié) = 2026-06-04 00:00 UTC (Jue UTC).
    // Bug original: usaba getUTCDay() → set [3,4,5] matcheaba Mié/Jue/Vie UTC
    // = Mar/Mié/Jue civiles. Reportado por el user: "primera semana sólo
    // Mié+Jue (no Vie), siguientes semanas Mar/Mié/Jue".
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [3, 4, 5], // Mié/Jue/Vie en calendario civil
      startsAt: new Date("2026-06-04T00:00:00Z"),
      endsAt: new Date("2026-07-04T00:00:00Z"),
    });

    const instances = generateSeriesInstances(series, undefined, "America/Santiago");
    const days = instances.map((i) => `${fmtDay(i.startsAt)} ${fmtDow(i.startsAt)}`);

    // Semana 1: Mié 03 (startsAt), Jue 04, Vie 05.
    expect(days).toContain("2026-06-03 Wed");
    expect(days).toContain("2026-06-04 Thu");
    expect(days).toContain("2026-06-05 Fri");

    // Semana 2: Mié 10, Jue 11, Vie 12 — NUNCA Mar 09.
    expect(days).toContain("2026-06-10 Wed");
    expect(days).toContain("2026-06-11 Thu");
    expect(days).toContain("2026-06-12 Fri");
    expect(days).not.toContain("2026-06-09 Tue");

    // Semana 3: Mié 17, Jue 18, Vie 19.
    expect(days).toContain("2026-06-17 Wed");
    expect(days).toContain("2026-06-18 Thu");
    expect(days).toContain("2026-06-19 Fri");
    expect(days).not.toContain("2026-06-16 Tue");

    // Semana 4: Mié 24, Jue 25, Vie 26.
    expect(days).toContain("2026-06-24 Wed");
    expect(days).toContain("2026-06-25 Thu");
    expect(days).toContain("2026-06-26 Fri");

    // Cada instancia debe ser Mié/Jue/Vie civil (nunca Mar/Sáb/Dom/Lun).
    for (const inst of instances) {
      expect(["Wed", "Thu", "Fri"]).toContain(fmtDow(inst.startsAt));
    }
  });

  it("Vie 21:00 Chile + repeats sólo Vie → todas Vie civiles (no Sáb UTC)", () => {
    // startsAt = 2026-06-05 21:00 Chile = 2026-06-06 01:00 UTC (Sáb UTC).
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [5], // sólo Vie civil
      startsAt: new Date("2026-06-06T01:00:00Z"),
      endsAt: new Date("2026-06-27T01:00:00Z"),
    });

    const instances = generateSeriesInstances(series, undefined, "America/Santiago");
    for (const inst of instances) {
      expect(fmtDow(inst.startsAt)).toBe("Fri");
    }
    const days = instances.map((i) => fmtDay(i.startsAt));
    expect(days).toEqual(["2026-06-05", "2026-06-12", "2026-06-19", "2026-06-26"]);
  });

  it("default daysOfWeek (set vacío) cae sobre el civil DOW del startsAt", () => {
    // startsAt = Mié 20:00 Chile → default debería repetir cada Miércoles
    // civil, no cada Jueves UTC.
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [],
      startsAt: new Date("2026-06-04T00:00:00Z"),
      endsAt: new Date("2026-06-25T00:00:00Z"),
    });

    const instances = generateSeriesInstances(series, undefined, "America/Santiago");
    for (const inst of instances) {
      expect(fmtDow(inst.startsAt)).toBe("Wed");
    }
  });

  it("TZ UTC mantiene el comportamiento legacy (sin shift)", () => {
    // Backwards compat: si timeZone="UTC" (default), el matching usa UTC DOW.
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [1, 3, 5], // Mon/Wed/Fri UTC
      startsAt: new Date("2026-06-01T14:00:00Z"), // Mon 14:00 UTC
      endsAt: new Date("2026-06-30T14:00:00Z"),
    });

    const instances = generateSeriesInstances(series);
    const days = instances.map((i) => i.startsAt.toISOString().slice(0, 10));
    // Días "calendario UTC" deben ser todos lunes/miércoles/viernes.
    for (const inst of instances) {
      expect([1, 3, 5]).toContain(inst.startsAt.getUTCDay());
    }
    expect(days).toContain("2026-06-01");
    expect(days).toContain("2026-06-03");
    expect(days).toContain("2026-06-05");
  });
});

// ─── Matriz de cobertura por tipo de repetición ──────────────────────────────
const TZ = "America/Santiago";
const fmtCivilDow = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
const fmtCivilDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
const fmtCivilTime = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

// Helper para construir un Date UTC desde "civil Chile" en una fecha concreta
// donde TZ vale UTC-4 (invierno, mayo–septiembre 2026). Útil para escribir
// startsAt en tests sin tener que calcular el offset mentalmente.
function chileWinter(civilIso: string, hh: number, mm: number): Date {
  // civilIso "2026-07-08" → quiero ese día a hh:mm Chile (UTC-4) → UTC = hh+4
  const [y, m, d] = civilIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh + 4, mm, 0));
}

describe("generateSeriesInstances — WEEKLY · matriz de casos en TZ Chile", () => {
  // Tabla: para cada civil DOW de la semana, una clase a 20:00 Chile que
  // repite SOLO ese mismo civil DOW. Confirma que la TZ-aware logic no
  // depende del shift particular del bug original.
  const cases: Array<{ name: string; civilDow: number; firstCivilDay: string }> = [
    { name: "Lun", civilDow: 1, firstCivilDay: "2026-07-06" },
    { name: "Mar", civilDow: 2, firstCivilDay: "2026-07-07" },
    { name: "Mié", civilDow: 3, firstCivilDay: "2026-07-08" },
    { name: "Jue", civilDow: 4, firstCivilDay: "2026-07-09" },
    { name: "Vie", civilDow: 5, firstCivilDay: "2026-07-10" },
    { name: "Sáb", civilDow: 6, firstCivilDay: "2026-07-11" },
    { name: "Dom", civilDow: 0, firstCivilDay: "2026-07-12" },
  ];

  for (const c of cases) {
    it(`${c.name} 20:00 Chile + repeat sólo ${c.name} → todas instancias en ${c.name} civil`, () => {
      const series = makeSeries({
        repeatFrequency: "WEEKLY",
        repeatOnDaysOfWeek: [c.civilDow],
        startsAt: chileWinter(c.firstCivilDay, 20, 0),
        endsAt: chileWinter("2026-08-15", 20, 0),
      });

      const instances = generateSeriesInstances(series, undefined, TZ);
      expect(instances.length).toBeGreaterThan(3);
      for (const inst of instances) {
        expect(inst.startsAt.getUTCDay()).not.toBe(c.civilDow); // sanity: hay shift UTC
        expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][c.civilDow]).toBe(
          fmtCivilDow(inst.startsAt)
        );
      }
    });
  }

  it("10:00 Chile (sin cruce de medianoche UTC) también respeta civil DOW", () => {
    // 10:00 Chile = 14:00 UTC mismo día → civil DOW == UTC DOW, no hay shift.
    // Confirma que el fix no rompe el caso fácil.
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [3], // Mié civil
      startsAt: chileWinter("2026-07-08", 10, 0),
      endsAt: chileWinter("2026-07-29", 10, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    for (const inst of instances) {
      expect(fmtCivilDow(inst.startsAt)).toBe("Wed");
      expect(fmtCivilTime(inst.startsAt)).toBe("10:00");
    }
  });

  it("L–V (lunes a viernes) sólo días hábiles, sin sábado/domingo", () => {
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [1, 2, 3, 4, 5],
      startsAt: chileWinter("2026-07-06", 20, 0), // Lun
      endsAt: chileWinter("2026-07-26", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    const civilDows = instances.map((i) => fmtCivilDow(i.startsAt));
    expect(civilDows).not.toContain("Sat");
    expect(civilDows).not.toContain("Sun");
    // 3 semanas completas × 5 días = 15.
    expect(instances.length).toBe(15);
  });

  it("Sáb + Dom (sólo fin de semana) sin días hábiles", () => {
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [0, 6],
      startsAt: chileWinter("2026-07-11", 20, 0), // Sáb
      endsAt: chileWinter("2026-08-02", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    const civilDows = new Set(instances.map((i) => fmtCivilDow(i.startsAt)));
    expect(civilDows).toEqual(new Set(["Sat", "Sun"]));
    expect(instances.length).toBe(8); // 4 semanas × 2 días
  });

  it("repeatEveryN=2 (cada 2 semanas) — salta semanas intermedias", () => {
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [3], // Mié
      repeatEveryN: 2,
      startsAt: chileWinter("2026-07-08", 20, 0),
      endsAt: chileWinter("2026-08-26", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    const civilDays = instances.map((i) => fmtCivilDay(i.startsAt));
    // Mié 08/07, 22/07, 05/08, 19/08 (cada 2 semanas).
    expect(civilDays).toEqual([
      "2026-07-08",
      "2026-07-22",
      "2026-08-05",
      "2026-08-19",
    ]);
  });

  it("repeatCount limita el total de instancias", () => {
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [3, 4, 5],
      startsAt: chileWinter("2026-07-08", 20, 0),
      endsAt: chileWinter("2026-12-31", 20, 0),
      repeatCount: 5,
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    expect(instances.length).toBe(5);
  });

  it("Dom 23:00 Chile (más cerca de medianoche, Lun UTC) → todas Dom civil", () => {
    // 23:00 Chile = 03:00 Lun UTC. Comprobamos que el shift más grande
    // sigue resolviéndose.
    const series = makeSeries({
      repeatFrequency: "WEEKLY",
      repeatOnDaysOfWeek: [0], // Dom
      startsAt: new Date("2026-07-13T03:00:00Z"), // Dom 12/07 23:00 Chile
      endsAt: new Date("2026-08-10T03:00:00Z"),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    for (const inst of instances) {
      expect(fmtCivilDow(inst.startsAt)).toBe("Sun");
      expect(fmtCivilTime(inst.startsAt)).toBe("23:00");
    }
    expect(instances.length).toBe(5);
  });
});

describe("generateSeriesInstances — DAILY · matriz en TZ Chile", () => {
  it("DAILY 20:00 Chile por una semana → 7 instancias, civil días consecutivos", () => {
    const series = makeSeries({
      repeatFrequency: "DAILY",
      repeatOnDaysOfWeek: [],
      startsAt: chileWinter("2026-07-08", 20, 0),
      endsAt: chileWinter("2026-07-14", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    expect(instances.length).toBe(7);
    const civilDays = instances.map((i) => fmtCivilDay(i.startsAt));
    expect(civilDays).toEqual([
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
    ]);
  });

  it("DAILY repeatEveryN=2 → salta días intermedios", () => {
    const series = makeSeries({
      repeatFrequency: "DAILY",
      repeatOnDaysOfWeek: [],
      repeatEveryN: 2,
      startsAt: chileWinter("2026-07-08", 20, 0),
      endsAt: chileWinter("2026-07-20", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    const civilDays = instances.map((i) => fmtCivilDay(i.startsAt));
    expect(civilDays).toEqual([
      "2026-07-08",
      "2026-07-10",
      "2026-07-12",
      "2026-07-14",
      "2026-07-16",
      "2026-07-18",
      "2026-07-20",
    ]);
  });

  it("DAILY excluye feriado en su día civil real (Chile), no UTC", () => {
    // Feriado 2026-07-10. Sin TZ, la clase del día 9 a las 20:00 Chile
    // (= 10/07 00:00 UTC) sería excluida incorrectamente.
    const series = makeSeries({
      repeatFrequency: "DAILY",
      repeatOnDaysOfWeek: [],
      startsAt: chileWinter("2026-07-08", 20, 0),
      endsAt: chileWinter("2026-07-12", 20, 0),
    });
    const holidays = new Set(["2026-07-10"]);
    const instances = generateSeriesInstances(series, holidays, TZ);
    const civilDays = instances.map((i) => fmtCivilDay(i.startsAt));
    expect(civilDays).not.toContain("2026-07-10");
    expect(civilDays).toContain("2026-07-09"); // este NO es feriado en Chile
    expect(civilDays).toContain("2026-07-11");
  });
});

describe("generateSeriesInstances — MONTHLY · matriz en TZ Chile", () => {
  it("MONTHLY dayOfMonth 8 a las 20:00 Chile → siempre día 8 civil", () => {
    const series = makeSeries({
      repeatFrequency: "MONTHLY",
      repeatOnDaysOfWeek: [],
      monthlyMode: "dayOfMonth",
      startsAt: chileWinter("2026-07-08", 20, 0),
      endsAt: chileWinter("2026-10-08", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    const civilDays = instances.map((i) => fmtCivilDay(i.startsAt));
    expect(civilDays).toEqual([
      "2026-07-08",
      "2026-08-08",
      "2026-09-08",
      "2026-10-08",
    ]);
  });

  it("MONTHLY dayOfMonth 31 → meses con <31 caen al último día válido", () => {
    const series = makeSeries({
      repeatFrequency: "MONTHLY",
      repeatOnDaysOfWeek: [],
      monthlyMode: "dayOfMonth",
      startsAt: chileWinter("2026-07-31", 20, 0),
      endsAt: chileWinter("2026-11-30", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    const civilDays = instances.map((i) => fmtCivilDay(i.startsAt));
    // Jul 31 (✓), Ago 31 (✓), Sep 30 (último día), Oct 31 (✓), Nov 30.
    expect(civilDays).toContain("2026-07-31");
    expect(civilDays).toContain("2026-08-31");
    expect(civilDays).toContain("2026-09-30");
    expect(civilDays).toContain("2026-10-31");
    expect(civilDays).toContain("2026-11-30");
  });

  it("MONTHLY weekdayOrdinal 1er Mié 20:00 Chile → 1er Mié civil de cada mes", () => {
    const series = makeSeries({
      repeatFrequency: "MONTHLY",
      repeatOnDaysOfWeek: [],
      monthlyMode: "weekdayOrdinal",
      startsAt: chileWinter("2026-07-01", 20, 0), // Mié 1 julio
      endsAt: chileWinter("2026-12-31", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    for (const inst of instances) {
      expect(fmtCivilDow(inst.startsAt)).toBe("Wed");
    }
    const civilDays = instances.map((i) => fmtCivilDay(i.startsAt));
    // 1er Mié de cada mes: Jul 1, Ago 5, Sep 2, Oct 7, Nov 4, Dic 2.
    expect(civilDays).toEqual([
      "2026-07-01",
      "2026-08-05",
      "2026-09-02",
      "2026-10-07",
      "2026-11-04",
      "2026-12-02",
    ]);
  });

  it("MONTHLY weekdayOrdinal 3er Vie 20:00 Chile → 3er Vie civil de cada mes", () => {
    const series = makeSeries({
      repeatFrequency: "MONTHLY",
      repeatOnDaysOfWeek: [],
      monthlyMode: "weekdayOrdinal",
      startsAt: chileWinter("2026-07-17", 20, 0), // 3er Vie julio
      endsAt: chileWinter("2026-10-31", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    for (const inst of instances) {
      expect(fmtCivilDow(inst.startsAt)).toBe("Fri");
    }
    const civilDays = instances.map((i) => fmtCivilDay(i.startsAt));
    // 3er Vie de cada mes: Jul 17, Ago 21, Sep 18, Oct 16.
    expect(civilDays).toEqual([
      "2026-07-17",
      "2026-08-21",
      "2026-09-18",
      "2026-10-16",
    ]);
  });

  it("MONTHLY weekdayOrdinal 5to Mié → meses sin 5ta semana se saltean", () => {
    // 5to Mié 20:00 Chile arrancando 29 julio (que tiene 5 Mié).
    // Agosto 2026 sólo tiene 4 Mié → debería saltar Agosto.
    const series = makeSeries({
      repeatFrequency: "MONTHLY",
      repeatOnDaysOfWeek: [],
      monthlyMode: "weekdayOrdinal",
      startsAt: chileWinter("2026-07-29", 20, 0), // 5to Mié julio
      endsAt: chileWinter("2026-12-31", 20, 0),
    });
    const instances = generateSeriesInstances(series, undefined, TZ);
    const civilDays = instances.map((i) => fmtCivilDay(i.startsAt));
    // 5tos Mié 2026: 29 jul, 30 sep, 30 dic. Ago, oct, nov no tienen.
    expect(civilDays).toEqual([
      "2026-07-29",
      "2026-09-30",
      "2026-12-30",
    ]);
  });
});
