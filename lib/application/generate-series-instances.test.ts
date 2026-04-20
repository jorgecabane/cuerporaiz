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
    isTrialClass: false,
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
});
