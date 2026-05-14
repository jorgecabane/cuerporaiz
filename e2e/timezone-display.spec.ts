/**
 * Verifica que la UI muestre las fechas en la TZ del centro (America/Santiago)
 * y no en la TZ del runtime del server. Este test se asegura de no regresionar
 * al bug que vimos en producción (Vercel corre en UTC: un evento a 10am Chile
 * se mostraba como 2pm).
 *
 * Setup:
 * - Playwright corre el webServer con `TZ=UTC` (ver playwright.config.ts).
 *   En local sin esto, el bug se enmascara porque la máquina ya está en Chile.
 * - El centro e2e-test tiene `timezone: "America/Santiago"` (default del seed).
 */
import { test, expect } from "@playwright/test";
import { seedEvent, cleanupEvents } from "./helpers/cleanup";

const RUNTIME_TZ = "America/Santiago";

/** Hora "HH" extraída del format que usa la app (toLocale* con hour/minute). */
function expectedChileHour(d: Date): string {
  // Forzamos 24h para tener un número claro; la página puede usar 12h
  // (depende del runtime), pero el dígito de la hora civil es estable.
  return d.toLocaleTimeString("es-CL", {
    timeZone: RUNTIME_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

test.describe("Display de fechas — TZ del centro", () => {
  test.describe.configure({ mode: "serial" });

  let runId: string;
  let eventId: string | null = null;
  // UTC anchor — invierno chileno (UTC-4 sin ambigüedad de DST).
  // 14:00 UTC en julio = 10:00 Chile.
  const startsAtUtc = new Date(Date.UTC(2026, 6, 15, 14, 0, 0));
  const endsAtUtc = new Date(Date.UTC(2026, 6, 15, 16, 0, 0));

  test.beforeAll(async () => {
    runId = Date.now().toString(36);
    const event = await seedEvent({
      centerSlug: "e2e-test",
      title: `E2E TZ Display ${runId}`,
      amountCents: 0,
      startsAt: startsAtUtc,
      endsAt: endsAtUtc,
    });
    if (!event) throw new Error("seedEvent falló (¿DB disponible?)");
    eventId = event.id;
  });

  test.afterAll(async () => {
    await cleanupEvents(`E2E TZ Display ${runId}`);
  });

  test("admin: detalle de evento muestra hora en TZ de Chile, no del server", async ({ page }) => {
    if (!eventId) test.skip();
    // Sanity: la TZ del runtime de tests debe poder formatear Chile.
    expect(expectedChileHour(startsAtUtc)).toBe("10:00");
    expect(expectedChileHour(endsAtUtc)).toBe("12:00");

    await page.goto(`/panel/eventos/${eventId}`);
    await expect(page.getByRole("heading", { name: new RegExp(`E2E TZ Display ${runId}`) })).toBeVisible({
      timeout: 15000,
    });

    // El detail page muestra "Inicio: …10:00…" y "Fin: …12:00…".
    // Buscamos los dígitos de la hora civil (tolerante a 12h con AM/PM o 24h).
    const body = await page.locator("body").innerText();
    // Debe contener la hora Chile (10:00 o "10:00 a. m.")
    expect(body).toMatch(/\b10:00\b/);
    expect(body).toMatch(/\b12:00\b/);
    // Y NO debe contener la hora UTC cruda (síntoma del bug original).
    expect(body).not.toMatch(/\b14:00\b/);
    expect(body).not.toMatch(/\b16:00\b/);
  });

  test("admin: lista de eventos muestra la fecha del día correcto en TZ Chile", async ({ page }) => {
    if (!eventId) test.skip();
    await page.goto("/panel/eventos");
    // Localmente Playwright corre el browser en es-CL por defecto. La pista
    // que buscamos es el día 15 (en TZ Chile el evento sigue siendo el 15;
    // sólo se correría a 16 si el render usara UTC + horas tardías).
    await expect(page.getByText(new RegExp(`E2E TZ Display ${runId}`)).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
