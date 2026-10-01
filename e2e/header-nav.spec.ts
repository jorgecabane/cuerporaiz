import { test, expect } from "@playwright/test";
import { NAV_GROUP_LABELS } from "../lib/domain/public-nav";

/** Header público agrupado: submenús (NAV_GROUP_LABELS) + Blog + Contacto. */
test.describe("Header público agrupado", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("desktop: el submenú Practica abre, navega y se cierra con Escape", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalogo");
    const nav = page.getByRole("navigation", { name: "Principal" });
    const practica = nav.getByRole("button", { name: NAV_GROUP_LABELS.practice });

    await expect(practica).toHaveAttribute("aria-expanded", "false");
    await practica.click();
    await expect(practica).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: /Eventos y Experiencias/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(practica).toHaveAttribute("aria-expanded", "false");
    await expect(practica).toBeFocused();

    await practica.click();
    await nav.getByRole("link", { name: /Eventos y Experiencias/ }).click();
    await page.waitForURL(/\/eventos/);
  });

  test("mobile: el menú muestra los grupos con sus links", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/catalogo");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    const menu = page.getByRole("navigation", { name: "Menú móvil" });
    await expect(menu.getByText(NAV_GROUP_LABELS.practice, { exact: true })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Biblioteca Virtual|Online/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Contacto" })).toBeVisible();
  });
});
