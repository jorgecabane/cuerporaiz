import { test, expect } from "@playwright/test";
import {
  seedTier1StudentWithActivePlan,
  seedTier1LiveClass,
  setUserPlanValidity,
  getCenterPlanExpiringNoticeDays,
  setCenterPlanExpiringNoticeDays,
  cleanupTier1UsersByEmailPrefix,
  cleanupLiveClasses,
  cleanupPlans,
} from "./helpers/cleanup";

/**
 * Plan vencido con clases sin usar (caso real: usó 6 de 8 y pasaron los 30 días).
 * El estado guardado sigue ACTIVE; la app debe mostrarlo como Vencido, ofrecer comprar
 * otro y explicar el motivo al reservar.
 */
test.describe("Planes vencidos — el alumno entiende que debe comprar otro", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: { cookies: [], origins: [] } });

  const runId = Date.now().toString(36);
  const emailPrefix = "plan-vencido-e2e-";
  const email = `${emailPrefix}${runId}@e2e.test`;
  const password = "Test1234!";
  const planName = `E2E Vencido ${runId}`;
  const classTitle = `E2E Clase Vencido ${runId}`;
  let liveClassId: string | null = null;

  test.beforeAll(async () => {
    const seed = await seedTier1StudentWithActivePlan({
      centerSlug: "e2e-test",
      email,
      password,
      classesTotal: 8,
      classesUsed: 6,
      planName,
    });
    if (!seed) return;
    const DAY = 86_400_000;
    await setUserPlanValidity(seed.userPlanId, new Date(Date.now() - 31 * DAY), new Date(Date.now() - DAY));
    liveClassId = (await seedTier1LiveClass({ centerSlug: "e2e-test", title: classTitle, daysFromNow: 3 }))?.liveClassId ?? null;
  });

  test.afterAll(async () => {
    await cleanupTier1UsersByEmailPrefix(emailPrefix);
    await cleanupLiveClasses(classTitle);
    await cleanupPlans(planName);
  });

  test("Planes muestra Vencido con botón para comprar otro, y reservar explica por qué", async ({ page }) => {
    test.skip(!liveClassId, "Seed no disponible (sin DB en este worker)");

    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/panel/, { timeout: 15000 });

    // Inicio: ya no dice el nombre del plan como vigente.
    await expect(page.getByText(/venció el/)).toBeVisible({ timeout: 15000 });

    await page.goto("/panel/tienda");
    const card = page.getByRole("listitem").filter({ hasText: planName });
    await expect(card.getByText("Vencido", { exact: true })).toBeVisible();
    await expect(card.getByText(/^Venció el/)).toBeVisible();
    await expect(card.getByText("Usaste 6 de 8 clases")).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Activos$/ })).toBeVisible();

    await card.getByRole("link", { name: "Comprar otro plan" }).click();
    await expect(page).toHaveURL(/#planes-disponibles$/);

    const res = await page.request.post("/api/reservations", { data: { liveClassId } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("NO_ACTIVE_PLAN");
    expect(body.message).toMatch(new RegExp(`Tu plan ${planName} venció el .+\\. Compra otro para seguir reservando\\.`));
  });
});

test.describe("Configuración — días de aviso de vencimiento", () => {
  let original: number | null = null;

  test.beforeAll(async () => {
    original = await getCenterPlanExpiringNoticeDays("e2e-test");
  });

  test.afterAll(async () => {
    if (original !== null) await setCenterPlanExpiringNoticeDays("e2e-test", original);
  });

  test("el admin cambia los días de aviso y se guardan", async ({ page }) => {
    await page.goto("/panel/configuracion");
    const field = page.getByLabel(/Avisar que un plan vence pronto/i);
    await expect(field).toBeVisible({ timeout: 15000 });
    await field.fill("10");
    await page.getByRole("button", { name: /Guardar configuración/i }).click();
    await expect(page.getByRole("button", { name: /Guardar configuración/i })).toBeEnabled({ timeout: 10000 });
    await expect.poll(() => getCenterPlanExpiringNoticeDays("e2e-test")).toBe(10);
  });
});
