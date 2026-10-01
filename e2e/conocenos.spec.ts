import { test, expect } from "@playwright/test";
import { NAV_GROUP_LABELS } from "../lib/domain/public-nav";

/** Página "Conócenos": se activa desde /panel/sitio, aparece en el submenú "about" y se oculta (404). */
test.describe("Conócenos", () => {
  async function setVisible(page: import("@playwright/test").Page, visible: boolean, title?: string) {
    await page.goto("/panel/sitio?tab=conocenos");
    const toggle = page.getByLabel(/Página visible y en el menú/);
    if ((await toggle.isChecked()) !== visible) await toggle.click();
    if (title) await page.getByLabel("Título").fill(title);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status")).toContainText("Guardado");
  }

  test("el admin la activa, se ve en el menú y al desactivarla devuelve 404", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const title = `Una salita para volver a ti (e2e ${Date.now()})`;

    await setVisible(page, true, title);
    await page.goto("/conocenos");
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

    // Con 2+ links el grupo "about" es submenú; con uno solo, link directo.
    const nav = page.getByRole("navigation", { name: "Principal" });
    const group = nav.getByRole("button", { name: NAV_GROUP_LABELS.about });
    if (await group.count()) await group.click();
    await expect(nav.getByRole("link", { name: /Conócenos/ })).toBeVisible();

    await setVisible(page, false);
    const res = await page.goto("/conocenos");
    expect(res?.status()).toBe(404);
  });
});
