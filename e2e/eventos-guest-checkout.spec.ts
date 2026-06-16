import { test, expect } from "@playwright/test";
import {
  seedEvent,
  cleanupEvents,
  cleanupEventTickets,
  cleanupTier1UsersByEmailPrefix,
} from "./helpers/cleanup";

/**
 * Guest checkout de eventos (sin login) desde la página pública /eventos/[id].
 * Cubre el flujo gratuito completo (sin MP): formulario guest → ticket PAID →
 * confirmación pública por token → reclamar cuenta (setear contraseña).
 *
 * Corre sin sesión (storageState vacío). Usa el centro público "e2e-test"
 * (NEXT_PUBLIC_DEFAULT_CENTER_SLUG en el entorno e2e).
 */
test.describe("Eventos — guest checkout público", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: { cookies: [], origins: [] } });

  const runId = Date.now().toString(36);
  const emailPrefix = "guest-evt-e2e-";
  const guestEmail = `${emailPrefix}${runId}@e2e.test`;
  let freeEvent: { id: string; title: string } | null = null;

  test.beforeAll(async () => {
    freeEvent = await seedEvent({
      centerSlug: "e2e-test",
      title: `E2E Guest Evento Gratis ${runId}`,
      amountCents: 0,
    });
  });

  test.afterAll(async () => {
    if (freeEvent) await cleanupEventTickets(freeEvent.id);
    await cleanupTier1UsersByEmailPrefix(emailPrefix);
    await cleanupEvents(`E2E Guest Evento Gratis ${runId}`);
  });

  test("evento gratis: compra guest → confirmación → reclamar cuenta", async ({ page }) => {
    test.skip(!freeEvent, "Seed del evento no disponible (sin DB en este worker)");
    if (!freeEvent) return;

    await page.goto(`/eventos/${freeEvent.id}`);
    await expect(
      page.getByRole("heading", { name: new RegExp(freeEvent.title, "i") })
    ).toBeVisible({ timeout: 15000 });

    // No autenticado → CTA guest. Abre el formulario inline (desktop).
    await page.getByRole("button", { name: /^Reservar entrada$/i }).click();

    await page.getByLabel(/Nombre completo/i).fill("Camila Guest");
    await page.getByLabel(/^Email$/i).fill(guestEmail);
    await page.getByLabel(/Teléfono/i).fill("+56 9 1234 5678");

    await page.getByRole("button", { name: /Confirmar reserva/i }).click();

    // Redirige a la confirmación pública por token.
    await page.waitForURL(/\/eventos\/confirmacion\//, { timeout: 15000 });
    await expect(page.getByText(/entrada está confirmada/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(guestEmail).first()).toBeVisible();

    // Reclamar cuenta: setear contraseña.
    await page.getByLabel(/Crea tu contraseña/i).fill("guestpass1234");
    await page.getByRole("button", { name: /Crear mi cuenta/i }).click();
    await expect(page.getByText(/tu cuenta está lista/i)).toBeVisible({ timeout: 10000 });
  });

  test("email ya registrado → invita a iniciar sesión", async ({ page }) => {
    test.skip(!freeEvent, "Seed del evento no disponible (sin DB en este worker)");
    if (!freeEvent) return;

    await page.goto(`/eventos/${freeEvent.id}`);
    await page.getByRole("button", { name: /^Reservar entrada$/i }).click();

    // student@e2e.test es una cuenta registrada (con contraseña).
    await page.getByLabel(/Nombre completo/i).fill("Estudiante Existente");
    await page.getByLabel(/^Email$/i).fill("student@e2e.test");
    await page.getByLabel(/Teléfono/i).fill("+56 9 8765 4321");
    await page.getByRole("button", { name: /Confirmar reserva/i }).click();

    await expect(page.getByText(/Ya tienes una cuenta con este correo/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
