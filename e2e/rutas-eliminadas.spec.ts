import { test, expect } from "@playwright/test";

/**
 * Rutas API que no tenían ningún caller (ni UI, ni e2e, ni docs) y se eliminaron.
 * Si alguna vuelve a existir, este test avisa para revisar si de verdad hace falta.
 */
const DELETED: { method: "get" | "post" | "patch"; path: string }[] = [
  { method: "get", path: "/api/plans" },
  { method: "get", path: "/api/catalog" },
  { method: "get", path: "/api/catalog/x" },
  { method: "get", path: "/api/catalog/x/y" },
  { method: "get", path: "/api/centers" },
  { method: "get", path: "/api/centers/e2e-test/live-classes" },
  { method: "post", path: "/api/admin/payments" },
  { method: "get", path: "/api/panel/admin/reservations" },
  { method: "patch", path: "/api/panel/on-demand/reorder" },
];

test.describe("Rutas API eliminadas", () => {
  for (const { method, path } of DELETED) {
    test(`${method.toUpperCase()} ${path} → 404`, async ({ request }) => {
      const res = await request[method](path, { data: {} });
      expect(res.status()).toBe(404);
      // El handler devolvía JSON 404 para ids inexistentes; sin ruta, Next responde su página HTML.
      expect(res.headers()["content-type"] ?? "").not.toContain("application/json");
    });
  }

  test("GET /api/admin/manual-payments → 405 (solo queda POST)", async ({ request }) => {
    const res = await request.get("/api/admin/manual-payments");
    expect(res.status()).toBe(405);
  });
});
