import { test, expect } from "@playwright/test";
import {
  seedEvent,
  setEventTimes,
  cleanupEvents,
  cleanupEventTickets,
  cleanupTier1UsersByEmailPrefix,
} from "./helpers/cleanup";

/**
 * Evento online: compra guest de 2 cupos con un asistente → la confirmación
 * muestra 2 links personales → antes de hora, sala de espera → en la ventana,
 * redirige a la reunión. Token inexistente → "no es válido".
 */
test.describe("Eventos online — link personal", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: { cookies: [], origins: [] } });

  const runId = Date.now().toString(36);
  const emailPrefix = "online-evt-e2e-";
  const title = `E2E Evento Online ${runId}`;
  const meetingUrl = "https://zoom.us/j/123456789";
  let event: { id: string; title: string } | null = null;
  let entryPaths: string[] = [];

  test.beforeAll(async () => {
    event = await seedEvent({ centerSlug: "e2e-test", title, amountCents: 0, isOnline: true, meetingUrl });
  });

  test.afterAll(async () => {
    if (event) await cleanupEventTickets(event.id);
    await cleanupTier1UsersByEmailPrefix(emailPrefix);
    await cleanupEvents(title);
  });

  test("compra con asistente → 2 links en la confirmación", async ({ page }) => {
    test.skip(!event, "Seed del evento no disponible (sin DB en este worker)");
    if (!event) return;

    await page.goto(`/eventos/${event.id}`);
    await page.getByRole("button", { name: /^Reservar entrada$/i }).click();
    await page.getByRole("button", { name: /Aumentar cantidad de entradas/i }).click();
    await page.getByLabel(/Nombre completo/i).fill("Comprador Online");
    await page.getByLabel(/^Email$/i).fill(`${emailPrefix}${runId}@e2e.test`);
    await page.getByLabel(/Teléfono/i).fill("+56 9 1234 5678");
    await page.getByLabel(/Entrada 2 · nombre/i).fill("Ana");
    await page.getByRole("button", { name: /Confirmar reserva/i }).click();

    await page.waitForURL(/\/eventos\/confirmacion\//, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Tus entradas" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Entrada 1 · tú")).toBeVisible();
    await expect(page.getByText("Entrada 2 · Ana")).toBeVisible();

    const urls = await page.getByText(/\/eventos\/entrar\//).allTextContents();
    entryPaths = urls.map((u) => new URL(u.trim()).pathname);
    expect(entryPaths).toHaveLength(2);
  });

  test("antes de hora → sala de espera", async ({ page }) => {
    test.skip(entryPaths.length === 0, "Sin links de la compra anterior");
    await page.goto(entryPaths[0]);
    await expect(page.getByText(/Sala de espera/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(/La sala se abre 10 minutos antes/i)).toBeVisible();
  });

  test("en la ventana → redirige a la reunión", async ({ request }) => {
    test.skip(entryPaths.length === 0 || !event, "Sin links de la compra anterior");
    const now = Date.now();
    await setEventTimes(event!.id, new Date(now + 5 * 60_000), new Date(now + 65 * 60_000));
    const res = await request.get(entryPaths[1], { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]).toBe(meetingUrl);
  });

  test("admin ve quién entró, revoca un link y el link revocado deja de servir", async ({ browser, page }) => {
    test.skip(entryPaths.length === 0 || !event, "Sin links de la compra anterior");
    const admin = await browser.newContext({ storageState: ".auth/admin.json" });
    const adminPage = await admin.newPage();
    await adminPage.goto(`/panel/eventos/${event!.id}`);
    await expect(adminPage.getByRole("heading", { name: "Asistentes online" })).toBeVisible({ timeout: 15000 });
    await expect(adminPage.getByText(/Entró a las/)).toBeVisible();
    await expect(adminPage.getByText("No ha entrado")).toBeVisible();

    await adminPage.getByRole("button", { name: "Revocar link" }).first().click();
    await adminPage.getByRole("button", { name: "Revocar link" }).last().click(); // confirmar en el diálogo
    await expect(adminPage.getByText("Revocado")).toBeVisible({ timeout: 10000 });
    await admin.close();

    await page.goto(entryPaths[0]);
    await expect(page.getByRole("heading", { name: /Este link no es válido/i })).toBeVisible();
  });

  test("sala de espera con reloj adelantado: redirige sola sin martillar al servidor", async ({ page }) => {
    test.skip(entryPaths.length === 0 || !event, "Sin links de la compra anterior");
    const opensInMs = 8_000;
    const startsAt = new Date(Date.now() + 10 * 60_000 + opensInMs);
    await setEventTimes(event!.id, startsAt, new Date(startsAt.getTime() + 60 * 60_000));

    await page.route("https://zoom.us/**", (route) => route.fulfill({ body: "<h1>Zoom</h1>", contentType: "text/html" }));
    let serverHits = 0;
    page.on("request", (req) => {
      if (new URL(req.url()).pathname === entryPaths[1]) serverHits++;
    });
    // El reloj del navegador va 30 s adelantado: cree que la sala ya abrió.
    await page.clock.install({ time: new Date(Date.now() + 30_000) });

    await page.goto(entryPaths[1]);
    await expect(page.getByText(/Sala de espera/i)).toBeVisible();
    await page.waitForURL(/zoom\.us/, { timeout: 30_000 });
    expect(serverHits).toBeLessThanOrEqual(5);
  });

  test("token inexistente → no es válido", async ({ page }) => {
    await page.goto("/eventos/entrar/token-que-no-existe");
    await expect(page.getByRole("heading", { name: /Este link no es válido/i })).toBeVisible();
  });
});

test.describe("Eventos online — formulario del panel", () => {
  test.describe.configure({ mode: "serial" });
  const title = `E2E Online Form ${Date.now().toString(36)}`;

  test.afterAll(async () => {
    await cleanupEvents(title);
  });

  test("crea un evento online pegando el link (valida https) y luego puede cambiarlo", async ({ page }) => {
    await page.goto("/panel/eventos/nuevo");
    await expect(page.getByRole("heading", { name: /Nuevo evento/i })).toBeVisible({ timeout: 15000 });
    await page.getByLabel(/Título/i).fill(title);
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await page.getByLabel(/Fecha inicio/i).fill(`${day}T19:00`);
    await page.getByLabel(/Fecha fin/i).fill(`${day}T20:00`);

    await page.getByLabel("Evento online").check();
    const manual = page.getByLabel(/Pega el link de la reunión/i);
    await expect(manual).toBeVisible({ timeout: 15000 });

    await manual.fill("http://zoom.us/j/1");
    await page.getByRole("button", { name: /Crear evento/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /https/i })).toBeVisible();

    await manual.fill("https://zoom.us/j/987654321");
    await page.getByRole("button", { name: /Crear evento/i }).click();
    await page.waitForURL(/\/panel\/eventos\/(?!nuevo)[^/]+$/, { timeout: 15000 });
    await expect(page.getByText("Online: https://zoom.us/j/987654321")).toBeVisible();

    await page.getByRole("button", { name: /^Editar$/ }).click();
    await page.getByRole("button", { name: /Cambiar link/i }).click();
    await expect(page.getByLabel(/Pega el link de la reunión/i)).toBeVisible();
  });
});
