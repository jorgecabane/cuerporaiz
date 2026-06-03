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
});
