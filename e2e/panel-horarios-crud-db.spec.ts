import { test, expect } from "@playwright/test";
import {
  cleanupHorariosByTitlePrefix,
  ensureE2EUser,
  getE2EPrisma,
  hashE2EPassword,
  seedHorarioWeeklySeries,
} from "./helpers/cleanup";

const TEST_PREFIX = "E2E CRUD";
const CENTER_SLUG = "e2e-test";
const RES_EMAIL_PREFIX = "e2e-crud-res";

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

/** Día de la semana (corto) de un instante en una TZ dada. Robusto a runner/center TZ. */
function weekdayInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d);
}

/** Crea un alumno + reserva CONFIRMED sobre una clase. Devuelve userId. */
async function seedConfirmedReservation(
  centerId: string,
  liveClassId: string,
  tag: string,
): Promise<string> {
  const prisma = await getE2EPrisma();
  const passwordHash = await hashE2EPassword("res-e2e");
  const user = await ensureE2EUser({
    centerId,
    email: `${RES_EMAIL_PREFIX}-${tag}@e2e.test`,
    passwordHash,
    name: `Reserva ${tag}`,
    role: "STUDENT",
  });
  if (!user) throw new Error("no se pudo crear usuario de reserva");
  await prisma.reservation.create({
    data: { userId: user.id, liveClassId, status: "CONFIRMED" },
  });
  return user.id;
}

test.describe.configure({ mode: "serial" });

test.describe("Panel admin · Horarios CRUD · contra DB real", () => {
  let centerId: string;
  let centerTz: string;

  test.beforeAll(async () => {
    const prisma = await getE2EPrisma();
    const center = await prisma.center.findUnique({ where: { slug: CENTER_SLUG } });
    if (!center) throw new Error(`Centro ${CENTER_SLUG} no existe (correr db:seed)`);
    centerId = center.id;
    centerTz = center.timezone ?? "America/Santiago";
  });

  test.afterAll(async () => {
    await cleanupHorariosByTitlePrefix(TEST_PREFIX);
    const prisma = await getE2EPrisma();
    await prisma.user
      .deleteMany({ where: { email: { startsWith: RES_EMAIL_PREFIX } } })
      .catch(() => {});
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
    await page.getByRole("button", { name: /Confirmar y guardar/i }).click();
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
    await page.getByRole("button", { name: /Confirmar y guardar/i }).click();
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

  // ── Caso I/K · scope=all sólo propiedades preserva reservas ───────────

  test("scope=all sólo título → camino barato, reserva confirmada se conserva", async ({
    page,
  }) => {
    const prisma = await getE2EPrisma();
    const seed = await seedHorarioWeeklySeries({
      centerSlug: CENTER_SLUG,
      count: 4,
      titlePrefix: `${TEST_PREFIX} prop-keep-res-src`,
    });
    if (!seed) throw new Error("seed null");
    const { seriesId, instances } = seed;
    await seedConfirmedReservation(centerId, instances[2].id, `keep-${Date.now().toString(36)}`);

    await page.goto(`/panel/horarios/${instances[0].id}`);
    await page.getByRole("button", { name: /^Toda la serie$/ }).click();
    const newTitle = `${TEST_PREFIX} prop-keep-res-result ${Date.now().toString(36)}`;
    await page.getByLabel(/Nombre de la clase/i).fill(newTitle);
    await page.getByRole("button", { name: /Guardar cambios/i }).click();
    await page.getByRole("button", { name: /Confirmar y guardar/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios($|\?)/, { timeout: 10000 });

    // Mismas instancias (no se regeneraron) + reserva intacta.
    const after = await prisma.liveClass.findMany({ where: { seriesId } });
    expect(after.length).toBe(4);
    expect(after.every((c) => c.title === newTitle)).toBe(true);
    const stillThere = await prisma.liveClass.findUnique({ where: { id: instances[2].id } });
    expect(stillThere).not.toBeNull();
    const res = await prisma.reservation.count({
      where: { liveClassId: instances[2].id, status: "CONFIRMED" },
    });
    expect(res).toBe(1);
  });

  // ── Caso J · cambio de horario bloqueado por reserva confirmada ───────

  test("scope=all cambio de horario con reserva confirmada → bloquea, DB intacta", async ({
    page,
  }) => {
    const prisma = await getE2EPrisma();
    const seed = await seedHorarioWeeklySeries({
      centerSlug: CENTER_SLUG,
      count: 4,
      titlePrefix: `${TEST_PREFIX} block-res-src`,
    });
    if (!seed) throw new Error("seed null");
    const { seriesId, instances } = seed;
    await seedConfirmedReservation(centerId, instances[2].id, `block-${Date.now().toString(36)}`);
    const seriesBefore = await prisma.liveClassSeries.findUnique({ where: { id: seriesId } });

    await page.goto(`/panel/horarios/${instances[0].id}`);
    await page.getByRole("button", { name: /^Toda la serie$/ }).click();
    // Cambia la fecha (mueve un día) → cambio de horario.
    const moved = new Date(instances[0].startsAt.getTime() + 86400000);
    await page.getByLabel(/Fecha y hora inicio/i).fill(localDatetimeInput(moved));
    await page.getByRole("button", { name: /Guardar cambios/i }).click();

    // Diálogo de conflicto: muestra reservas y NO ofrece confirmar.
    await expect(page.getByText(/tienen reservas confirmadas/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Confirmar y guardar/i })).toHaveCount(0);
    await page.getByRole("button", { name: /Entendido/i }).click();

    // DB sin cambios: misma serie (startsAt) y mismas instancias.
    const seriesAfter = await prisma.liveClassSeries.findUnique({ where: { id: seriesId } });
    expect(seriesAfter!.startsAt.toISOString()).toBe(seriesBefore!.startsAt.toISOString());
    const after = await prisma.liveClass.findMany({ where: { seriesId } });
    expect(after.length).toBe(4);
    expect(after.map((c) => c.id).sort()).toEqual(instances.map((i) => i.id).sort());
  });

  // ── Caso AI · reducir cupos bajo reservas confirmadas → bloquea ───────

  test("scope=all cupos < reservas confirmadas → bloquea, DB intacta", async ({ page }) => {
    const prisma = await getE2EPrisma();
    const seed = await seedHorarioWeeklySeries({
      centerSlug: CENTER_SLUG,
      count: 3,
      titlePrefix: `${TEST_PREFIX} block-cap-src`,
    });
    if (!seed) throw new Error("seed null");
    const { seriesId, instances } = seed;
    const stamp = Date.now().toString(36);
    await seedConfirmedReservation(centerId, instances[1].id, `cap1-${stamp}`);
    await seedConfirmedReservation(centerId, instances[1].id, `cap2-${stamp}`);

    await page.goto(`/panel/horarios/${instances[0].id}`);
    await page.getByRole("button", { name: /^Toda la serie$/ }).click();
    await page.getByLabel(/Cupos/i).fill("1"); // 1 < 2 reservas confirmadas
    await page.getByRole("button", { name: /Guardar cambios/i }).click();

    await expect(page.getByText(/cupo es menor que las reservas/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Confirmar y guardar/i })).toHaveCount(0);
    await page.getByRole("button", { name: /Entendido/i }).click();

    const series = await prisma.liveClassSeries.findUnique({ where: { id: seriesId } });
    expect(series!.maxCapacity).toBe(10); // sin cambios
  });

  // ── Caso X · clases desvinculadas se avisan y no se tocan ─────────────

  test("scope=all con instancia desvinculada → avisa y la deja intacta", async ({ page }) => {
    const prisma = await getE2EPrisma();
    const seed = await seedHorarioWeeklySeries({
      centerSlug: CENTER_SLUG,
      count: 4,
      titlePrefix: `${TEST_PREFIX} detached-src`,
    });
    if (!seed) throw new Error("seed null");
    const { seriesId, instances } = seed;
    // Desvincula la 2da instancia (simula un "solo esta" previo).
    await prisma.liveClass.update({
      where: { id: instances[1].id },
      data: { seriesId: null, detachedFromSeriesId: seriesId },
    });

    await page.goto(`/panel/horarios/${instances[0].id}`);
    await page.getByRole("button", { name: /^Toda la serie$/ }).click();
    const newTitle = `${TEST_PREFIX} detached-result ${Date.now().toString(36)}`;
    await page.getByLabel(/Nombre de la clase/i).fill(newTitle);
    await page.getByRole("button", { name: /Guardar cambios/i }).click();

    // El diálogo avisa de las clases sueltas no afectadas.
    await expect(page.getByText(/clase.*suelta.*no se/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Confirmar y guardar/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios($|\?)/, { timeout: 10000 });

    // La instancia desvinculada sigue suelta y con su título original.
    const detached = await prisma.liveClass.findUnique({ where: { id: instances[1].id } });
    expect(detached!.seriesId).toBeNull();
    expect(detached!.title).not.toBe(newTitle);
  });

  // ── Caso A · scope=all mover el día mueve todas las ocurrencias ───────

  test("scope=all cambiar el día → todas las futuras se mueven al nuevo día", async ({
    page,
  }) => {
    const prisma = await getE2EPrisma();
    const seed = await seedHorarioWeeklySeries({
      centerSlug: CENTER_SLUG,
      count: 4,
      titlePrefix: `${TEST_PREFIX} daymove-src`,
    });
    if (!seed) throw new Error("seed null");
    const { seriesId, instances } = seed;
    const origDow = weekdayInTz(instances[0].startsAt, centerTz);
    const seriesBefore = await prisma.liveClassSeries.findUnique({ where: { id: seriesId } });

    await page.goto(`/panel/horarios/${instances[0].id}`);
    await page.getByRole("button", { name: /^Toda la serie$/ }).click();
    // Mueve el inicio +1 día (otra fecha civil ⇒ otro día de la semana).
    const moved = new Date(instances[0].startsAt.getTime() + 86400000);
    await page.getByLabel(/Fecha y hora inicio/i).fill(localDatetimeInput(moved));
    await page.getByRole("button", { name: /Guardar cambios/i }).click();
    await page.getByRole("button", { name: /Confirmar y guardar/i }).click();
    await expect(page).toHaveURL(/\/panel\/horarios($|\?)/, { timeout: 10000 });

    // La serie cambió su día y las instancias futuras están todas en el nuevo
    // día civil (distinto al original). Bug #1: antes "no hacía nada".
    const seriesAfter = await prisma.liveClassSeries.findUnique({ where: { id: seriesId } });
    expect(seriesAfter!.startsAt.toISOString()).not.toBe(seriesBefore!.startsAt.toISOString());
    expect(seriesAfter!.repeatOnDaysOfWeek).not.toEqual(seriesBefore!.repeatOnDaysOfWeek);

    const after = await prisma.liveClass.findMany({
      where: { seriesId, status: "ACTIVE" },
      orderBy: { startsAt: "asc" },
    });
    expect(after.length).toBeGreaterThan(0);
    const newDows = new Set(after.map((c) => weekdayInTz(c.startsAt, centerTz)));
    expect(newDows.size).toBe(1); // todas el mismo día
    expect([...newDows][0]).not.toBe(origDow); // y distinto al original
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
