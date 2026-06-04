import { test, expect } from "@playwright/test";
import {
  cleanupHorariosByTitlePrefix,
  getE2EPrisma,
  seedHorarioWeeklySeries,
} from "./helpers/cleanup";

const TEST_PREFIX = "E2E CRUD";
const CENTER_SLUG = "e2e-test";

function localDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function futureDate(daysAhead: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, minute, 0, 0);
  return d;
}

test.describe.configure({ mode: "serial" });

test.describe("Panel admin · Horarios CRUD · contra DB real", () => {
  let centerId: string;

  test.beforeAll(async () => {
    const prisma = await getE2EPrisma();
    const center = await prisma.center.findUnique({ where: { slug: CENTER_SLUG } });
    if (!center) throw new Error(`Centro ${CENTER_SLUG} no existe (correr db:seed)`);
    centerId = center.id;
  });

  test.afterAll(async () => {
    await cleanupHorariosByTitlePrefix(TEST_PREFIX);
  });

  // ── CREATE ────────────────────────────────────────────────────────────

  test("Create single class → fila en DB con todos los fields", async ({ page }) => {
    const prisma = await getE2EPrisma();
    const runId = Date.now().toString(36);
    const title = `${TEST_PREFIX} create-single ${runId}`;
    const startsAt = futureDate(7, 15, 30);

    await page.goto("/panel/horarios/nueva");
    await page.getByLabel(/Nombre de la clase/i).fill(title);
    await page.getByLabel(/Fecha y hora inicio/i).fill(localDatetimeInput(startsAt));
    await page.getByLabel(/Duración \(min\)/i).fill("75");
    await page.getByLabel(/Cupos/i).fill("15");
    await page.getByRole("button", { name: /^Crear clase$/ }).click();
    await expect(page).toHaveURL(/\/panel\/horarios$|\/panel\/horarios\?/, {
      timeout: 10000,
    });

    const found = await prisma.liveClass.findFirst({ where: { title } });
    expect(found).not.toBeNull();
    expect(found!.centerId).toBe(centerId);
    expect(found!.durationMinutes).toBe(75);
    expect(found!.maxCapacity).toBe(15);
    expect(found!.seriesId).toBeNull();
    expect(found!.status).toBe("ACTIVE");
  });

  // ── UPDATE single ─────────────────────────────────────────────────────

  test("Update single class → DB refleja título + duración actualizados", async ({ page }) => {
    const prisma = await getE2EPrisma();
    const runId = Date.now().toString(36);
    const seedTitle = `${TEST_PREFIX} update-src ${runId}`;
    const seed = await prisma.liveClass.create({
      data: {
        centerId,
        title: seedTitle,
        startsAt: futureDate(8),
        durationMinutes: 60,
        maxCapacity: 10,
      },
    });

    await page.goto(`/panel/horarios/${seed.id}`);
    await expect(page.getByRole("heading", { name: /Editar clase/i })).toBeVisible({
      timeout: 10000,
    });

    const newTitle = `${TEST_PREFIX} update-result ${runId}`;
    await page.getByLabel(/Nombre de la clase/i).fill(newTitle);
    await page.getByLabel(/Duración \(min\)/i).fill("90");
    await page.getByRole("button", { name: /Guardar cambios/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios$|\/panel\/horarios\?/, {
      timeout: 10000,
    });

    const after = await prisma.liveClass.findUnique({ where: { id: seed.id } });
    expect(after!.title).toBe(newTitle);
    expect(after!.durationMinutes).toBe(90);
    expect(after!.maxCapacity).toBe(10);
  });

  // ── UPDATE series · scope=this ────────────────────────────────────────

  test("Update series scope=this → solo esa instancia cambia y se desvincula", async ({
    page,
  }) => {
    const prisma = await getE2EPrisma();
    const seed = await seedHorarioWeeklySeries({
      centerSlug: CENTER_SLUG,
      count: 4,
      titlePrefix: `${TEST_PREFIX} scope-this-src`,
    });
    if (!seed) throw new Error("seedHorarioWeeklySeries devolvió null");
    const { seriesId, title: seedTitle, instances } = seed;
    const target = instances[1];

    await page.goto(`/panel/horarios/${target.id}`);
    await expect(page.getByText(/Esta clase es parte de una serie/i)).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /^Solo esta clase$/ }).click();

    const newTitle = `${TEST_PREFIX} scope-this-result ${Date.now().toString(36)}`;
    await page.getByLabel(/Nombre de la clase/i).fill(newTitle);
    await page.getByRole("button", { name: /Guardar cambios/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios$|\/panel\/horarios\?/, {
      timeout: 10000,
    });

    const updated = await prisma.liveClass.findUnique({ where: { id: target.id } });
    expect(updated!.title).toBe(newTitle);
    expect(updated!.seriesId).toBeNull(); // se desvinculó de la serie

    // Las otras 3 instancias siguen ligadas y sin tocar.
    const remaining = await prisma.liveClass.findMany({
      where: { seriesId },
    });
    expect(remaining.length).toBe(3);
    for (const c of remaining) {
      expect(c.title).toBe(seedTitle);
    }
  });

  // ── UPDATE series · scope=thisAndFollowing ────────────────────────────

  test("Update series scope=thisAndFollowing → corte por fecha + nueva serie", async ({
    page,
  }) => {
    const prisma = await getE2EPrisma();
    const seed = await seedHorarioWeeklySeries({
      centerSlug: CENTER_SLUG,
      count: 5,
      titlePrefix: `${TEST_PREFIX} scope-future-src`,
    });
    if (!seed) throw new Error("seedHorarioWeeklySeries devolvió null");
    const { seriesId, instances } = seed;
    const target = instances[2]; // 3ra

    await page.goto(`/panel/horarios/${target.id}`);
    await expect(page.getByText(/Esta clase es parte de una serie/i)).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /^Esta y las siguientes$/ }).click();

    const newTitle = `${TEST_PREFIX} scope-future-result ${Date.now().toString(36)}`;
    await page.getByLabel(/Nombre de la clase/i).fill(newTitle);
    await page.getByRole("button", { name: /Guardar cambios/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios$|\/panel\/horarios\?/, {
      timeout: 10000,
    });

    // Serie original: queda con sólo las 2 primeras instancias.
    const remainOld = await prisma.liveClass.findMany({
      where: { seriesId },
      orderBy: { startsAt: "asc" },
    });
    expect(remainOld.length).toBe(2);

    // Serie nueva con el nuevo título y las 3 instancias restantes.
    const newSeries = await prisma.liveClassSeries.findFirst({
      where: { title: newTitle },
    });
    expect(newSeries).not.toBeNull();
    const newInstances = await prisma.liveClass.findMany({
      where: { seriesId: newSeries!.id },
      orderBy: { startsAt: "asc" },
    });
    expect(newInstances.length).toBe(3);
    for (const c of newInstances) {
      expect(c.title).toBe(newTitle);
    }
  });

  // ── UPDATE series · scope=all ─────────────────────────────────────────

  test("Update series scope=all → serie + todas las instancias cambian", async ({
    page,
  }) => {
    const prisma = await getE2EPrisma();
    const seed = await seedHorarioWeeklySeries({
      centerSlug: CENTER_SLUG,
      count: 4,
      titlePrefix: `${TEST_PREFIX} scope-all-src`,
    });
    if (!seed) throw new Error("seedHorarioWeeklySeries devolvió null");
    const { seriesId, instances } = seed;

    await page.goto(`/panel/horarios/${instances[0].id}`);
    await expect(page.getByText(/Esta clase es parte de una serie/i)).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /^Toda la serie$/ }).click();

    const newTitle = `${TEST_PREFIX} scope-all-result ${Date.now().toString(36)}`;
    await page.getByLabel(/Nombre de la clase/i).fill(newTitle);
    await page.getByLabel(/Cupos/i).fill("25");
    await page.getByRole("button", { name: /Guardar cambios/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios$|\/panel\/horarios\?/, {
      timeout: 10000,
    });

    const after = await prisma.liveClass.findMany({ where: { seriesId } });
    expect(after.length).toBe(4);
    for (const c of after) {
      expect(c.title).toBe(newTitle);
      expect(c.maxCapacity).toBe(25);
    }
    const series = await prisma.liveClassSeries.findUnique({
      where: { id: seriesId },
    });
    expect(series!.title).toBe(newTitle);
    expect(series!.maxCapacity).toBe(25);
  });

  // ── CANCEL single ─────────────────────────────────────────────────────

  test("Cancel single class → status=CANCELLED en DB", async ({ page }) => {
    const prisma = await getE2EPrisma();
    const runId = Date.now().toString(36);
    const seedTitle = `${TEST_PREFIX} cancel-single ${runId}`;
    const seed = await prisma.liveClass.create({
      data: {
        centerId,
        title: seedTitle,
        startsAt: futureDate(10),
        durationMinutes: 60,
        maxCapacity: 10,
      },
    });

    await page.goto(`/panel/horarios/${seed.id}`);
    await expect(page.getByRole("heading", { name: /Editar clase/i })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /^Cancelar clase$/ }).click();
    await page.getByRole("button", { name: /Sí, cancelar/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios$|\/panel\/horarios\?/, {
      timeout: 10000,
    });

    const after = await prisma.liveClass.findUnique({ where: { id: seed.id } });
    expect(after!.status).toBe("CANCELLED");
  });

  // ── CANCEL series · scope=all ─────────────────────────────────────────

  test("Cancel series scope=all → todas las instancias status=CANCELLED", async ({
    page,
  }) => {
    const prisma = await getE2EPrisma();
    const seed = await seedHorarioWeeklySeries({
      centerSlug: CENTER_SLUG,
      count: 3,
      titlePrefix: `${TEST_PREFIX} cancel-series-src`,
    });
    if (!seed) throw new Error("seedHorarioWeeklySeries devolvió null");
    const { seriesId, instances } = seed;

    await page.goto(`/panel/horarios/${instances[0].id}`);
    await expect(page.getByText(/Esta clase es parte de una serie/i)).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /^Toda la serie$/ }).click();
    await page.getByRole("button", { name: /^Cancelar clase$/ }).click();
    await page.getByRole("button", { name: /Sí, cancelar/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios$|\/panel\/horarios\?/, {
      timeout: 10000,
    });

    const after = await prisma.liveClass.findMany({
      where: { seriesId },
      orderBy: { startsAt: "asc" },
    });
    expect(after.length).toBe(3);
    for (const c of after) {
      expect(c.status).toBe("CANCELLED");
    }
  });
});
