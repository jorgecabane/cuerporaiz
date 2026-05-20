import { test, expect } from "@playwright/test";
import {
  seedForeignCenterFixtures,
  cleanupForeignCenterFixtures,
  foreignResourceExists,
} from "./helpers/cleanup";

/**
 * Aislamiento multi-tenant: admin de centro A (e2e-test) NO debe poder mutar
 * recursos de centro B (e2e-foreign). Antes del fix PR #2, varios endpoints
 * admin-gated no validaban centerId del recurso → cualquier admin de cualquier
 * centro podía editar/borrar contenido ajeno.
 *
 * Estrategia:
 * - Seed centro extranjero con un set mínimo de recursos (section, about-image,
 *   category, practice, lesson, etc).
 * - Desde la sesión de admin de e2e-test, intentar PATCH/DELETE contra cada uno.
 * - Esperar 404 (los repos scoped devuelven null/false → handler responde 404).
 * - Re-leer en DB: el recurso sigue existiendo.
 */
test.describe("Multi-tenant — admin no puede mutar recursos de otro centro", () => {
  let fixtures: Awaited<ReturnType<typeof seedForeignCenterFixtures>> = null;

  test.beforeAll(async () => {
    fixtures = await seedForeignCenterFixtures();
  });

  test.afterAll(async () => {
    await cleanupForeignCenterFixtures();
  });

  test("DELETE /api/panel/site-sections/[id]/items/[itemId] de otro centro → 404 y no borra", async ({
    request,
  }) => {
    test.skip(!fixtures, "Sin DB en este worker");
    if (!fixtures) return;

    const res = await request.delete(
      `/api/panel/site-sections/${fixtures.siteSectionId}/items/${fixtures.siteSectionItemId}`,
    );
    expect(res.status()).toBe(404);
    expect(await foreignResourceExists("siteSectionItem", fixtures.siteSectionItemId)).toBe(true);
  });

  test("PATCH /api/panel/site-sections/[id] de otro centro → 404", async ({ request }) => {
    test.skip(!fixtures, "Sin DB en este worker");
    if (!fixtures) return;

    const res = await request.patch(`/api/panel/site-sections/${fixtures.siteSectionId}`, {
      data: { title: "POWNED" },
    });
    expect(res.status()).toBe(404);
  });

  test("PATCH /api/panel/about-page/images/[imageId] de otro centro → 404 y no muta", async ({
    request,
  }) => {
    test.skip(!fixtures, "Sin DB en este worker");
    if (!fixtures) return;

    const res = await request.patch(`/api/panel/about-page/images/${fixtures.aboutImageId}`, {
      data: { imageUrl: "https://attacker.test/owned.png" },
    });
    expect(res.status()).toBe(404);
    expect(await foreignResourceExists("aboutImage", fixtures.aboutImageId)).toBe(true);
  });

  test("DELETE /api/panel/about-page/images/[imageId] de otro centro → 404 y no borra", async ({
    request,
  }) => {
    test.skip(!fixtures, "Sin DB en este worker");
    if (!fixtures) return;

    const res = await request.delete(`/api/panel/about-page/images/${fixtures.aboutImageId}`);
    expect(res.status()).toBe(404);
    expect(await foreignResourceExists("aboutImage", fixtures.aboutImageId)).toBe(true);
  });

  test("DELETE /api/panel/on-demand/categories/[id] de otro centro → 404 y no borra", async ({
    request,
  }) => {
    test.skip(!fixtures, "Sin DB en este worker");
    if (!fixtures) return;

    const res = await request.delete(`/api/panel/on-demand/categories/${fixtures.categoryId}`);
    expect(res.status()).toBe(404);
    expect(await foreignResourceExists("category", fixtures.categoryId)).toBe(true);
  });

  test("PATCH on-demand practice de otro centro (vía categoría propia) → 404 y no muta", async ({
    request,
  }) => {
    test.skip(!fixtures, "Sin DB en este worker");
    if (!fixtures) return;

    // El attacker usa una categoría DEL ATACANTE como prefijo de URL, pero la
    // practiceId es del centro extranjero. Antes del refactor del repo, esto
    // pasaba el chequeo de categoría pero igual mutaba la practice ajena.
    // Ahora practiceRepository.update(id, centerId) bloquea por practice.category.centerId.
    const myCategoryRes = await request.get("/api/panel/on-demand/categories");
    if (myCategoryRes.ok()) {
      const myCats = (await myCategoryRes.json()) as Array<{ id: string }>;
      const myCatId = myCats[0]?.id;
      if (myCatId) {
        const res = await request.patch(
          `/api/panel/on-demand/categories/${myCatId}/practices/${fixtures.practiceId}`,
          { data: { name: "POWNED" } },
        );
        expect(res.status()).toBe(404);
      }
    }
    expect(await foreignResourceExists("practice", fixtures.practiceId)).toBe(true);
  });

  test("PATCH /api/panel/on-demand/lessons/[id] de otro centro → 404 y no muta", async ({
    request,
  }) => {
    test.skip(!fixtures, "Sin DB en este worker");
    if (!fixtures) return;

    const res = await request.patch(`/api/panel/on-demand/lessons/${fixtures.lessonId}`, {
      data: { title: "POWNED" },
    });
    expect(res.status()).toBe(404);
    expect(await foreignResourceExists("lesson", fixtures.lessonId)).toBe(true);
  });

  test("DELETE /api/panel/on-demand/lessons/[id] de otro centro → 404 y no borra", async ({
    request,
  }) => {
    test.skip(!fixtures, "Sin DB en este worker");
    if (!fixtures) return;

    const res = await request.delete(`/api/panel/on-demand/lessons/${fixtures.lessonId}`);
    expect(res.status()).toBe(404);
    expect(await foreignResourceExists("lesson", fixtures.lessonId)).toBe(true);
  });
});
