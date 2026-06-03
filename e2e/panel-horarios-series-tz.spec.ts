import { test, expect } from "@playwright/test";
import { generateSeriesInstances } from "../lib/application/generate-series-instances";
import { getE2EPrisma } from "./helpers/cleanup";

const CENTER_SLUG = "e2e-test";
const CENTER_TZ = "America/Santiago";

test.describe("Series WEEKLY · regresión bug día civil (DB real)", () => {
  let centerId: string;
  const createdSeriesIds: string[] = [];

  test.beforeAll(async () => {
    const prisma = await getE2EPrisma();
    const center = await prisma.center.findUnique({ where: { slug: CENTER_SLUG } });
    if (!center) throw new Error(`Centro ${CENTER_SLUG} no existe (corre db:seed)`);
    centerId = center.id;
    if (center.timezone !== CENTER_TZ) {
      await prisma.center.update({ where: { id: centerId }, data: { timezone: CENTER_TZ } });
    }
  });

  test.afterAll(async () => {
    if (createdSeriesIds.length === 0) return;
    const prisma = await getE2EPrisma();
    await prisma.liveClass.deleteMany({ where: { seriesId: { in: createdSeriesIds } } });
    await prisma.liveClassSeries.deleteMany({ where: { id: { in: createdSeriesIds } } });
  });

  test("Mié 20:00 Chile, repeats Mié/Jue/Vie por 4 semanas → 12 instancias en días civiles correctos", async () => {
    const prisma = await getE2EPrisma();
    const runId = Date.now().toString(36);
    const title = `E2E TZ Series ${runId}`;

    // 2026-07-08 (Mié) 20:00 Chile (UTC-4 en julio) = 2026-07-09 00:00 UTC.
    const startsAt = new Date("2026-07-09T00:00:00Z");
    // Hasta el sábado fin de mes para incluir Mié/Jue/Vie de todas las semanas.
    const endsAt = new Date("2026-08-01T03:59:00Z");

    const series = await prisma.liveClassSeries.create({
      data: {
        centerId,
        title,
        durationMinutes: 60,
        maxCapacity: 10,
        isOnline: false,
        acceptsTrialReservations: false,
        classPassEnabled: false,
        repeatFrequency: "WEEKLY",
        repeatOnDaysOfWeek: [3, 4, 5], // Mié, Jue, Vie en calendario civil
        repeatEveryN: 1,
        startsAt,
        endsAt,
        monthlyMode: null,
      },
    });
    createdSeriesIds.push(series.id);

    const instances = generateSeriesInstances(series, undefined, CENTER_TZ);
    await prisma.liveClass.createMany({
      data: instances.map((i) => ({
        centerId,
        seriesId: series.id,
        title: i.title,
        startsAt: i.startsAt,
        durationMinutes: i.durationMinutes,
        maxCapacity: i.maxCapacity,
      })),
    });

    const persisted = await prisma.liveClass.findMany({
      where: { seriesId: series.id },
      orderBy: { startsAt: "asc" },
    });

    const dayFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: CENTER_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dowFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: CENTER_TZ,
      weekday: "short",
    });

    const civilDays = persisted.map((c) => dayFmt.format(c.startsAt));
    const civilDows = persisted.map((c) => dowFmt.format(c.startsAt));

    // 4 semanas × 3 días = 12 instancias.
    expect(persisted.length).toBe(12);

    // Todas en Mié/Jue/Vie civil — nunca Mar (el bug original).
    for (const dow of civilDows) {
      expect(["Wed", "Thu", "Fri"]).toContain(dow);
    }
    expect(civilDows).not.toContain("Tue");

    // Las primeras 4 semanas, en orden.
    expect(civilDays).toEqual([
      "2026-07-08", "2026-07-09", "2026-07-10",
      "2026-07-15", "2026-07-16", "2026-07-17",
      "2026-07-22", "2026-07-23", "2026-07-24",
      "2026-07-29", "2026-07-30", "2026-07-31",
    ]);

    // Todas las instancias deben tener startsAt apuntando a 20:00 hora Chile.
    const hourFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: CENTER_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    for (const c of persisted) {
      expect(hourFmt.format(c.startsAt)).toBe("20:00");
    }
  });

  test("DST: serie Mié 20:00 Chile que cruza fin de verano (5-abr-2026) mantiene 20:00 civil en cada instancia", async () => {
    const prisma = await getE2EPrisma();
    const runId = Date.now().toString(36);
    const title = `E2E TZ DST Series ${runId}`;

    // 25-mar 2026 (Mié) verano (UTC-3): 20:00 Chile = 23:00 UTC.
    const startsAt = new Date("2026-03-25T23:00:00Z");
    // Hasta el 6-may 2026 (Mié) invierno (UTC-4): incluir varios Mié pre y post transición.
    const endsAt = new Date("2026-05-07T00:00:00Z");

    const series = await prisma.liveClassSeries.create({
      data: {
        centerId,
        title,
        durationMinutes: 60,
        maxCapacity: 10,
        isOnline: false,
        acceptsTrialReservations: false,
        classPassEnabled: false,
        repeatFrequency: "WEEKLY",
        repeatOnDaysOfWeek: [3], // Mié civil
        repeatEveryN: 1,
        startsAt,
        endsAt,
        monthlyMode: null,
      },
    });
    createdSeriesIds.push(series.id);

    const instances = generateSeriesInstances(series, undefined, CENTER_TZ);
    await prisma.liveClass.createMany({
      data: instances.map((i) => ({
        centerId,
        seriesId: series.id,
        title: i.title,
        startsAt: i.startsAt,
        durationMinutes: i.durationMinutes,
        maxCapacity: i.maxCapacity,
      })),
    });

    const persisted = await prisma.liveClass.findMany({
      where: { seriesId: series.id },
      orderBy: { startsAt: "asc" },
    });

    const dayFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: CENTER_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const hourFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: CENTER_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    expect(persisted.length).toBe(7);
    // Mié 25/03, 01/04 (verano UTC-3), 08/04, 15/04, 22/04, 29/04, 06/05 (invierno UTC-4).
    expect(persisted.map((c) => dayFmt.format(c.startsAt))).toEqual([
      "2026-03-25",
      "2026-04-01",
      "2026-04-08",
      "2026-04-15",
      "2026-04-22",
      "2026-04-29",
      "2026-05-06",
    ]);

    // Sin shift de hora civil a través del cambio de DST.
    for (const c of persisted) {
      expect(hourFmt.format(c.startsAt)).toBe("20:00");
    }

    // Sanity: los UTC reales SÍ cambian (UTC-3 antes vs UTC-4 después).
    expect(persisted[0].startsAt.toISOString()).toBe("2026-03-25T23:00:00.000Z");
    expect(persisted[2].startsAt.toISOString()).toBe("2026-04-09T00:00:00.000Z");
  });
});
