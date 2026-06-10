import { describe, it, expect } from "vitest";
import type { LiveClassSeries } from "@/lib/domain";
import {
  buildSeriesScheduleFields,
  scheduleChanged,
  syncWeeklyDaysOnStartDateChange,
  filterFutureInstances,
  findReservationConflicts,
  findCapacityConflicts,
  describeRecurrence,
  validateSeriesScheduleForm,
  buildSeriesEditPreview,
  type SeriesScheduleForm,
  type SeriesInstanceInfo,
  type SeriesEditScope,
} from "./series-edit";

function makeForm(overrides: Partial<SeriesScheduleForm> = {}): SeriesScheduleForm {
  return {
    startsAt: "2026-07-06T14:00:00.000Z", // Monday
    repeat: "WEEKLY",
    repeatOnDays: [1],
    repeatEveryN: 1,
    repeatEnd: "never",
    repeatEndDate: null,
    repeatEndCount: null,
    monthlyMode: null,
    ...overrides,
  };
}

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
    repeatOnDaysOfWeek: [1],
    repeatEveryN: 1,
    startsAt: new Date("2026-07-06T14:00:00.000Z"),
    endsAt: null,
    repeatCount: null,
    monthlyMode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("buildSeriesScheduleFields", () => {
  it("resuelve endsAt desde repeatEnd='date' al fin del día civil (inclusivo)", () => {
    const fields = buildSeriesScheduleFields(
      makeForm({ repeatEnd: "date", repeatEndDate: "2026-08-01" }),
    );
    // Fin del día → incluye las clases de ese día (no las trunca a medianoche).
    expect(fields.endsAt?.toISOString()).toBe("2026-08-01T23:59:59.999Z");
    expect(fields.repeatCount).toBeNull();
  });

  it("resuelve repeatCount desde repeatEnd='count'", () => {
    const fields = buildSeriesScheduleFields(
      makeForm({ repeatEnd: "count", repeatEndCount: 13 }),
    );
    expect(fields.repeatCount).toBe(13);
    expect(fields.endsAt).toBeNull();
  });

  it("repeatEnd='never' deja endsAt y repeatCount en null", () => {
    const fields = buildSeriesScheduleFields(makeForm({ repeatEnd: "never" }));
    expect(fields.endsAt).toBeNull();
    expect(fields.repeatCount).toBeNull();
  });

  it("MONTHLY sin monthlyMode usa 'dayOfMonth'", () => {
    const fields = buildSeriesScheduleFields(
      makeForm({ repeat: "MONTHLY", monthlyMode: null }),
    );
    expect(fields.monthlyMode).toBe("dayOfMonth");
  });

  it("no-MONTHLY deja monthlyMode null", () => {
    const fields = buildSeriesScheduleFields(
      makeForm({ repeat: "WEEKLY", monthlyMode: "weekdayOrdinal" }),
    );
    expect(fields.monthlyMode).toBeNull();
  });

  it("copia startsAt, frecuencia, días e intervalo", () => {
    const fields = buildSeriesScheduleFields(
      makeForm({ repeat: "WEEKLY", repeatOnDays: [2, 4], repeatEveryN: 2 }),
    );
    expect(fields.startsAt.toISOString()).toBe("2026-07-06T14:00:00.000Z");
    expect(fields.repeatFrequency).toBe("WEEKLY");
    expect(fields.repeatOnDaysOfWeek).toEqual([2, 4]);
    expect(fields.repeatEveryN).toBe(2);
  });
});

describe("scheduleChanged", () => {
  const TZ = "UTC";

  it("false si nada de horario/recurrencia cambió", () => {
    const series = makeSeries();
    const fields = buildSeriesScheduleFields(makeForm());
    expect(scheduleChanged(series, fields, TZ)).toBe(false);
  });

  it("false si sólo cambia la fecha absoluta pero no la hora ni el día (abrir otra instancia)", () => {
    // Misma hora civil (14:00) y mismo día de semana (lunes) → no es cambio de patrón.
    const series = makeSeries({ startsAt: new Date("2026-07-06T14:00:00.000Z") }); // lunes
    const fields = buildSeriesScheduleFields(
      makeForm({ startsAt: "2026-07-13T14:00:00.000Z" }), // lunes siguiente, misma hora
    );
    expect(scheduleChanged(series, fields, TZ)).toBe(false);
  });

  it("ignora el orden de los días", () => {
    const series = makeSeries({ repeatOnDaysOfWeek: [1, 3] });
    const fields = buildSeriesScheduleFields(makeForm({ repeatOnDays: [3, 1] }));
    expect(scheduleChanged(series, fields, TZ)).toBe(false);
  });

  it("true si cambia la hora de inicio", () => {
    const series = makeSeries({ startsAt: new Date("2026-07-06T14:00:00.000Z") });
    const fields = buildSeriesScheduleFields(
      makeForm({ startsAt: "2026-07-06T18:00:00.000Z" }),
    );
    expect(scheduleChanged(series, fields, TZ)).toBe(true);
  });

  it("true si cambian los días", () => {
    const series = makeSeries({ repeatOnDaysOfWeek: [1] });
    const fields = buildSeriesScheduleFields(makeForm({ repeatOnDays: [2] }));
    expect(scheduleChanged(series, fields, TZ)).toBe(true);
  });

  it("true si cambia la frecuencia", () => {
    const series = makeSeries({ repeatFrequency: "WEEKLY" });
    const fields = buildSeriesScheduleFields(
      makeForm({ repeat: "DAILY", repeatOnDays: [] }),
    );
    expect(scheduleChanged(series, fields, TZ)).toBe(true);
  });

  it("true si cambia el intervalo", () => {
    const series = makeSeries({ repeatEveryN: 1 });
    const fields = buildSeriesScheduleFields(makeForm({ repeatEveryN: 2 }));
    expect(scheduleChanged(series, fields, TZ)).toBe(true);
  });

  it("true si cambia el fin (count)", () => {
    const series = makeSeries({ repeatCount: null });
    const fields = buildSeriesScheduleFields(
      makeForm({ repeatEnd: "count", repeatEndCount: 5 }),
    );
    expect(scheduleChanged(series, fields, TZ)).toBe(true);
  });

  it("true si cambia endsAt (día civil distinto)", () => {
    const series = makeSeries({ endsAt: null });
    const fields = buildSeriesScheduleFields(
      makeForm({ repeatEnd: "date", repeatEndDate: "2026-09-01" }),
    );
    expect(scheduleChanged(series, fields, TZ)).toBe(true);
  });

  it("false si endsAt es el mismo día civil aunque difiera el instante", () => {
    // serie con endsAt a las 14:00; el form lo representa como fin de día → mismo día civil.
    const series = makeSeries({ endsAt: new Date("2026-08-01T14:00:00.000Z") });
    const fields = buildSeriesScheduleFields(
      makeForm({ repeatEnd: "date", repeatEndDate: "2026-08-01" }),
    );
    expect(scheduleChanged(series, fields, TZ)).toBe(false);
  });

  it("true si cambia monthlyMode", () => {
    const series = makeSeries({
      repeatFrequency: "MONTHLY",
      monthlyMode: "dayOfMonth",
    });
    const fields = buildSeriesScheduleFields(
      makeForm({ repeat: "MONTHLY", monthlyMode: "weekdayOrdinal" }),
    );
    expect(scheduleChanged(series, fields, TZ)).toBe(true);
  });

  it("MONTHLY dayOfMonth: true si cambia el día del mes del ancla", () => {
    const series = makeSeries({
      repeatFrequency: "MONTHLY",
      monthlyMode: "dayOfMonth",
      startsAt: new Date("2026-07-08T14:00:00.000Z"),
    });
    const fields = buildSeriesScheduleFields(
      makeForm({ repeat: "MONTHLY", monthlyMode: "dayOfMonth", startsAt: "2026-07-15T14:00:00.000Z" }),
    );
    expect(scheduleChanged(series, fields, TZ)).toBe(true);
  });
});

describe("syncWeeklyDaysOnStartDateChange", () => {
  it("serie de un día: mover Lun→Mar mueve el único día", () => {
    expect(syncWeeklyDaysOnStartDateChange([1], 1, 2)).toEqual([2]);
  });

  it("multi-día: mover el inicio desplaza todo el patrón por el delta (Mar→Lun ⇒ −1)", () => {
    // [Mar,Mié,Jue] abriendo el martes y moviéndolo a lunes ⇒ [Lun,Mar,Mié]
    expect(syncWeeklyDaysOnStartDateChange([2, 3, 4], 2, 1)).toEqual([1, 2, 3]);
  });

  it("multi-día: Jue/Vie con inicio a lunes desplaza −3 ⇒ Lun/Mar", () => {
    expect(syncWeeklyDaysOnStartDateChange([4, 5], 4, 1)).toEqual([1, 2]);
  });

  it("mismo día de la semana no cambia nada", () => {
    expect(syncWeeklyDaysOnStartDateChange([4, 5], 4, 4)).toEqual([4, 5]);
  });

  it("set vacío (default) se trata como un día y se mueve", () => {
    expect(syncWeeklyDaysOnStartDateChange([], 1, 2)).toEqual([2]);
  });

  it("hace wrap-around 0..6 (Dom/Sáb + 1)", () => {
    // [Dom(0),Sáb(6)] desplazado +1 ⇒ [Lun(1),Dom(0)] → ordenado [0,1]
    expect(syncWeeklyDaysOnStartDateChange([0, 6], 0, 1)).toEqual([0, 1]);
  });
});

describe("filterFutureInstances", () => {
  it("descarta las que empiezan antes de now y conserva las >= now", () => {
    const now = new Date("2026-07-10T00:00:00.000Z");
    const items = [
      { startsAt: new Date("2026-07-08T14:00:00.000Z") },
      { startsAt: new Date("2026-07-10T00:00:00.000Z") },
      { startsAt: new Date("2026-07-12T14:00:00.000Z") },
    ];
    const future = filterFutureInstances(items, now);
    expect(future).toHaveLength(2);
    expect(future[0].startsAt.toISOString()).toBe("2026-07-10T00:00:00.000Z");
  });
});

describe("findReservationConflicts", () => {
  it("devuelve sólo clases con reservas confirmadas (>0)", () => {
    const classes = [
      { id: "a", title: "Yoga", startsAt: "2026-07-13T14:00:00.000Z" },
      { id: "b", title: "Yoga", startsAt: "2026-07-20T14:00:00.000Z" },
    ];
    const confirmed = new Map([["a", 3]]);
    const conflicts = findReservationConflicts(classes, confirmed);
    expect(conflicts).toEqual([
      { id: "a", title: "Yoga", startsAt: "2026-07-13T14:00:00.000Z", confirmed: 3 },
    ]);
  });

  it("sin reservas devuelve lista vacía", () => {
    const classes = [{ id: "a", title: "Yoga", startsAt: "2026-07-13T14:00:00.000Z" }];
    expect(findReservationConflicts(classes, new Map())).toEqual([]);
  });
});

describe("findCapacityConflicts", () => {
  it("devuelve clases cuyas confirmadas superan el nuevo cupo", () => {
    const classes = [
      { id: "a", title: "Yoga", startsAt: "2026-07-13T14:00:00.000Z" },
      { id: "b", title: "Yoga", startsAt: "2026-07-20T14:00:00.000Z" },
    ];
    const confirmed = new Map([
      ["a", 8],
      ["b", 5],
    ]);
    const conflicts = findCapacityConflicts(classes, 5, confirmed);
    expect(conflicts).toEqual([
      {
        id: "a",
        title: "Yoga",
        startsAt: "2026-07-13T14:00:00.000Z",
        confirmed: 8,
        newCapacity: 5,
      },
    ]);
  });

  it("confirmadas iguales al cupo no son conflicto", () => {
    const classes = [{ id: "a", title: "Yoga", startsAt: "2026-07-13T14:00:00.000Z" }];
    const confirmed = new Map([["a", 5]]);
    expect(findCapacityConflicts(classes, 5, confirmed)).toEqual([]);
  });
});

describe("describeRecurrence", () => {
  it("WEEKLY un día", () => {
    const f = buildSeriesScheduleFields(makeForm({ repeat: "WEEKLY", repeatOnDays: [1] }));
    expect(describeRecurrence(f)).toBe("Cada semana los lunes");
  });

  it("WEEKLY dos días", () => {
    const f = buildSeriesScheduleFields(makeForm({ repeat: "WEEKLY", repeatOnDays: [4, 5] }));
    expect(describeRecurrence(f)).toBe("Cada semana los jueves y viernes");
  });

  it("WEEKLY tres días con intervalo", () => {
    const f = buildSeriesScheduleFields(
      makeForm({ repeat: "WEEKLY", repeatOnDays: [1, 3, 5], repeatEveryN: 2 }),
    );
    expect(describeRecurrence(f)).toBe("Cada 2 semanas los lunes, miércoles y viernes");
  });

  it("DAILY", () => {
    const f = buildSeriesScheduleFields(makeForm({ repeat: "DAILY", repeatOnDays: [] }));
    expect(describeRecurrence(f)).toBe("Todos los días");
  });

  it("DAILY con intervalo", () => {
    const f = buildSeriesScheduleFields(
      makeForm({ repeat: "DAILY", repeatOnDays: [], repeatEveryN: 3 }),
    );
    expect(describeRecurrence(f)).toBe("Cada 3 días");
  });

  it("MONTHLY", () => {
    const f = buildSeriesScheduleFields(makeForm({ repeat: "MONTHLY", repeatOnDays: [] }));
    expect(describeRecurrence(f)).toBe("Cada mes");
  });
});

describe("validateSeriesScheduleForm", () => {
  it("acepta un form válido", () => {
    expect(validateSeriesScheduleForm(makeForm(), { maxCapacity: 20, trialCapacity: 2 })).toBeNull();
  });

  it("rechaza endsAt anterior a startsAt", () => {
    const form = makeForm({
      startsAt: "2026-07-06T14:00:00.000Z",
      repeatEnd: "date",
      repeatEndDate: "2026-07-01T00:00:00.000Z",
    });
    expect(validateSeriesScheduleForm(form, { maxCapacity: 20, trialCapacity: null })).toMatch(/término/i);
  });

  it("rechaza repeatEveryN < 1", () => {
    expect(
      validateSeriesScheduleForm(makeForm({ repeatEveryN: 0 }), { maxCapacity: 20, trialCapacity: null }),
    ).toBeTruthy();
  });

  it("rechaza repeatEndCount < 1", () => {
    const form = makeForm({ repeatEnd: "count", repeatEndCount: 0 });
    expect(validateSeriesScheduleForm(form, { maxCapacity: 20, trialCapacity: null })).toBeTruthy();
  });

  it("rechaza trialCapacity > maxCapacity", () => {
    expect(
      validateSeriesScheduleForm(makeForm(), { maxCapacity: 5, trialCapacity: 8 }),
    ).toBeTruthy();
  });
});

describe("buildSeriesEditPreview", () => {
  const TZ = "UTC";
  const NOW = new Date("2026-07-01T00:00:00.000Z");
  // 4 lunes futuros a las 14:00.
  const DATES = [
    "2026-07-06T14:00:00.000Z",
    "2026-07-13T14:00:00.000Z",
    "2026-07-20T14:00:00.000Z",
    "2026-07-27T14:00:00.000Z",
  ];

  function previewSeries() {
    return makeSeries({
      startsAt: new Date(DATES[0]),
      endsAt: new Date(DATES[3]),
      repeatOnDaysOfWeek: [1],
    });
  }
  function instances(confirmed: Record<number, number> = {}): SeriesInstanceInfo[] {
    return DATES.map((d, i) => ({
      id: `i${i}`,
      title: "Yoga",
      startsAt: new Date(d),
      confirmed: confirmed[i] ?? 0,
    }));
  }
  // form que reproduce exactamente la serie (sin cambios de horario).
  function sameForm(over: Partial<SeriesScheduleForm> = {}) {
    return makeForm({
      startsAt: DATES[0],
      repeat: "WEEKLY",
      repeatOnDays: [1],
      repeatEnd: "date",
      repeatEndDate: "2026-07-27",
      ...over,
    });
  }
  function input(over: Partial<Parameters<typeof buildSeriesEditPreview>[0]> = {}) {
    return {
      series: previewSeries(),
      fields: buildSeriesScheduleFields(sameForm()),
      scope: "all" as SeriesEditScope,
      openedInstanceId: "i0",
      openedStartsAt: new Date(DATES[0]),
      instances: instances(),
      newCapacity: 20,
      holidayKeys: new Set<string>(),
      tz: TZ,
      now: NOW,
      detachedCount: 0,
      ...over,
    };
  }

  it("all sólo propiedades → no regenera, sin conflicto, cuenta las futuras", () => {
    const p = buildSeriesEditPreview(input());
    expect(p.scheduleChanged).toBe(false);
    expect(p.willRegenerate).toBe(false);
    expect(p.affectedCount).toBe(4);
    expect(p.pastPreserved).toBe(0);
    expect(p.conflict).toBeNull();
    expect(p.effectiveScope).toBe("all");
  });

  it("all con cambio de hora → regenera y cuenta las generadas", () => {
    const p = buildSeriesEditPreview(
      input({ fields: buildSeriesScheduleFields(sameForm({ startsAt: "2026-07-06T18:00:00.000Z" })) }),
    );
    expect(p.scheduleChanged).toBe(true);
    expect(p.willRegenerate).toBe(true);
    expect(p.affectedCount).toBe(4);
  });

  it("regenerando, bloquea por reserva confirmada en instancia futura", () => {
    const p = buildSeriesEditPreview(
      input({
        fields: buildSeriesScheduleFields(sameForm({ startsAt: "2026-07-06T18:00:00.000Z" })),
        instances: instances({ 2: 3 }),
      }),
    );
    expect(p.conflict).not.toBeNull();
    expect(p.conflict!.reservationClasses.map((c) => c.id)).toEqual(["i2"]);
  });

  it("sólo propiedades con reserva → NO bloquea (camino barato preserva)", () => {
    const p = buildSeriesEditPreview(input({ instances: instances({ 2: 3 }) }));
    expect(p.conflict).toBeNull();
  });

  it("bloquea por cupo menor que reservas confirmadas", () => {
    const p = buildSeriesEditPreview(input({ newCapacity: 1, instances: instances({ 1: 3 }) }));
    expect(p.conflict).not.toBeNull();
    expect(p.conflict!.capacityClasses.map((c) => c.id)).toEqual(["i1"]);
  });

  it("thisAndFollowing sobre la primera instancia → effectiveScope=all", () => {
    const p = buildSeriesEditPreview(
      input({ scope: "thisAndFollowing", openedInstanceId: "i0", openedStartsAt: new Date(DATES[0]) }),
    );
    expect(p.effectiveScope).toBe("all");
  });

  it("thisAndFollowing desde la 3ra → corta ahí, preserva las 2 anteriores", () => {
    const p = buildSeriesEditPreview(
      input({ scope: "thisAndFollowing", openedInstanceId: "i2", openedStartsAt: new Date(DATES[2]) }),
    );
    expect(p.effectiveScope).toBe("thisAndFollowing");
    expect(p.pastPreserved).toBe(2);
    expect(p.effectiveFrom).toBe(DATES[2]);
    expect(p.willRegenerate).toBe(true);
  });

  it("propaga detachedCount", () => {
    const p = buildSeriesEditPreview(input({ detachedCount: 2 }));
    expect(p.detachedCount).toBe(2);
  });
});
