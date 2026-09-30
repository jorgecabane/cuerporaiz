import "dotenv/config";
import { test, expect } from "@playwright/test";
import { prisma } from "../lib/adapters/db/prisma";
import { buildUnsubscribeUrl } from "../lib/application/newsletter-token";

/**
 * Newsletter del blog: suscripción solo con email desde la home y baja sin login
 * con link firmado (confirmar → volver a suscribirse). La seed deja visible la
 * sección "newsletter" en el centro e2e-test.
 */
const CENTER_SLUG = "e2e-test";

async function subscriberState(email: string) {
  const center = await prisma.center.findUniqueOrThrow({ where: { slug: CENTER_SLUG } });
  const row = await prisma.newsletterSubscriber.findUnique({
    where: { centerId_email: { centerId: center.id, email } },
  });
  return { centerId: center.id, row };
}

test.describe("Newsletter del blog", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("suscripción desde la home, baja con link firmado y re-suscripción", async ({ page }) => {
    const email = `e2e-news-${Date.now()}@e2e.test`;

    await page.goto("/");
    const block = page.locator("#newsletter");
    await block.scrollIntoViewIfNeeded();
    await block.getByLabel("Email").fill(email.toUpperCase());
    await block.getByRole("button", { name: "Suscribirme" }).click();
    await expect(block.getByRole("status")).toContainText("¡Listo!");

    const { centerId, row } = await subscriberState(email);
    expect(row?.unsubscribedAt).toBeNull();

    const url = new URL(buildUnsubscribeUrl("http://x", centerId, email));
    await page.goto(`${url.pathname}${url.search}`);
    await expect(page.getByRole("heading", { name: /Dejar de recibir novedades/ })).toBeVisible();
    await page.getByRole("button", { name: "Darme de baja" }).click();
    await expect(page.getByRole("heading", { name: /ya no recibirás novedades/ })).toBeVisible();
    expect((await subscriberState(email)).row?.unsubscribedAt).not.toBeNull();

    await page.getByRole("button", { name: /volver a suscribirme/ }).click();
    await expect(page.getByRole("heading", { name: /Bienvenido de vuelta/ })).toBeVisible();
    expect((await subscriberState(email)).row?.unsubscribedAt).toBeNull();

    await prisma.newsletterSubscriber.delete({ where: { centerId_email: { centerId, email } } });
  });

  test("link de baja manipulado muestra error y no da de baja", async ({ page }) => {
    await page.goto("/newsletter/baja?e=alguien%40e2e.test&t=token-falso");
    await expect(page.getByRole("heading", { name: "Link no válido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Darme de baja" })).toHaveCount(0);
  });

  test("la API rechaza emails inválidos", async ({ request }) => {
    const res = await request.post("/api/newsletter/subscribe", { data: { email: "no-es-un-email" } });
    expect(res.status()).toBe(400);
  });
});
