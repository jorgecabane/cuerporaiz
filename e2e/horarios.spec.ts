import { test, expect } from "@playwright/test";
import { NAV_GROUP_LABELS } from "../lib/domain/public-nav";

/** Página /horarios: calendario + "Acerca de las clases" + "Tu primera clase" (configurable). */
test.describe("Horarios", () => {
  test("el menú Practica → Horarios lleva a /horarios", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalogo");
    const nav = page.getByRole("navigation", { name: "Principal" });
    await nav.getByRole("button", { name: NAV_GROUP_LABELS.practice }).click();
    await nav.getByRole("link", { name: /^Horarios/ }).click();
    await page.waitForURL(/\/horarios$/);
    await expect(page.getByRole("heading", { level: 1, name: "Horarios" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Seleccionar día" })).toBeVisible();
  });

  test("el admin configura 'Tu primera clase' y aparece en /horarios", async ({ page }) => {
    const tip = `Llega 10 minutos antes (e2e ${Date.now()})`;
    await page.goto("/panel/sitio?tab=primera-clase");
    const textarea = page.getByLabel(/antes de su primera clase/);
    const previous = await textarea.inputValue();
    await textarea.fill(`${tip}\nVen con ropa cómoda.`);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status")).toContainText("Guardado");

    await page.goto("/horarios");
    const section = page.getByRole("region", { name: "Tu primera clase" });
    await expect(section.getByText(tip)).toBeVisible();
    await expect(section.getByText("Ven con ropa cómoda.")).toBeVisible();

    // Restaura el estado previo.
    await page.goto("/panel/sitio?tab=primera-clase");
    await page.getByLabel(/antes de su primera clase/).fill(previous);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status")).toContainText("Guardado");
  });
});
