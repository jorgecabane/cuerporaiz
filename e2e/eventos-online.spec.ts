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

  test("token inexistente → no es válido", async ({ page }) => {
    await page.goto("/eventos/entrar/token-que-no-existe");
    await expect(page.getByRole("heading", { name: /Este link no es válido/i })).toBeVisible();
  });
});
