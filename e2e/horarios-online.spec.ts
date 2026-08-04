import { test, expect, type Route } from "@playwright/test";
import { getE2EPrisma } from "./helpers/cleanup";

const CENTER_SLUG = "e2e-test";

/**
 * Verifica el auto-generado del link de reunión en "Nueva clase" (Task 5):
 * con exactamente un proveedor de video conectado, el link se genera solo
 * (sin apretar botón) al completar nombre + fecha/hora. La llamada real de
 * creación de reunión (server action `createMeetingForClass`) se intercepta
 * a nivel de red — nunca se llama a Zoom/Meet real.
 *
 * Nota sobre el mock: los server actions de Next viajan como un POST a la
 * misma URL con header `next-action`, y la respuesta es un stream "Flight"
 * (`text/x-component`). El formato mínimo para un valor resuelto es:
 *   0:{"a":"$@1","f":"","b":"<id>","q":"","i":false}\n1:<JSON del resultado>\n
 * Confirmado empíricamente contra un build real de esta app (Next 16.1.6,
 * webpack) antes de fijarlo acá.
 */
function mockedActionResponse(result: unknown): string {
  return (
    `0:{"a":"$@1","f":"","b":"E2E_MOCK","q":"","i":false}\n` +
    `1:${JSON.stringify(result)}\n`
  );
}

async function fulfillMeetingAction(route: Route, result: unknown): Promise<boolean> {
  const req = route.request();
  if (req.method() !== "POST" || !req.headers()["next-action"]) return false;
  await route.fulfill({
    status: 200,
    contentType: "text/x-component",
    body: mockedActionResponse(result),
  });
  return true;
}

function futureDatetimeLocal(hoursAhead: number): string {
  const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

test.describe("Nueva clase — auto-genera link con un solo proveedor conectado", () => {
  let centerId: string;

  test.beforeAll(async () => {
    const prisma = await getE2EPrisma();
    const center = await prisma.center.findUnique({ where: { slug: CENTER_SLUG } });
    if (!center) throw new Error("no existe el centro e2e-test");
    centerId = center.id;
    // Sólo Zoom conectado (hasCredentials = accessToken no vacío). Google Meet
    // se deja sin configurar para que quede "exactamente un proveedor".
    await prisma.centerZoomConfig.upsert({
      where: { centerId },
      update: { accessToken: "e2e-fake-access-token", enabled: true },
      create: { centerId, accessToken: "e2e-fake-access-token", enabled: true },
    });
  });

  test.afterAll(async () => {
    const prisma = await getE2EPrisma();
    // Vuelve al baseline (sin plugin conectado) para no afectar otros specs.
    await prisma.centerZoomConfig.deleteMany({ where: { centerId } });
  });

  test("con campos incompletos, el botón de generar queda deshabilitado con aviso", async ({ page }) => {
    await page.goto("/panel/horarios/nueva");
    await page.getByLabel("Clase online").check();

    const generateButton = page.getByRole("button", { name: "Generar link con Zoom" });
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeDisabled();
    await expect(page.getByText("Completa nombre y fecha/hora para generar el link.")).toBeVisible();
  });

  test("con nombre y fecha/hora, el link se genera solo (sin apretar botón)", async ({ page }) => {
    let meetingCalls = 0;
    await page.route("**/panel/horarios/nueva", async (route) => {
      const handled = await fulfillMeetingAction(route, {
        joinUrl: "https://zoom.us/j/E2E_MOCKED_LINK",
        externalId: "E2E_MOCKED_EXTERNAL_ID",
        provider: "zoom",
      });
      if (handled) {
        meetingCalls++;
        return;
      }
      await route.continue();
    });

    await page.goto("/panel/horarios/nueva");
    await page.getByLabel("Clase online").check();

    // Sin nombre/fecha todavía: el botón deshabilitado sigue visible, sin llamadas.
    await expect(page.getByRole("button", { name: "Generar link con Zoom" })).toBeDisabled();

    await page.getByLabel("Nombre de la clase").fill("Yoga Online E2E");
    await page.getByLabel("Fecha y hora inicio").fill(futureDatetimeLocal(24));

    // El botón desaparece (ya no faltan campos) y el link llega solo, sin click.
    await expect(page.getByRole("button", { name: "Generar link con Zoom" })).toHaveCount(0);
    await expect(page.getByText("Link de la reunión")).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[readonly]')).toHaveValue("https://zoom.us/j/E2E_MOCKED_LINK");

    expect(meetingCalls).toBeGreaterThan(0);
  });
});

/**
 * Verifica el auto-generado + la guarda "online requiere link" en "Editar
 * clase" (Task 6). Igual que en "Nueva clase", la llamada real de creación de
 * reunión se intercepta a nivel de red — nunca se llama a Zoom/Meet real.
 */
test.describe("Editar clase — auto-genera link con un solo proveedor conectado", () => {
  let centerId: string;

  test.beforeAll(async () => {
    const prisma = await getE2EPrisma();
    const center = await prisma.center.findUnique({ where: { slug: CENTER_SLUG } });
    if (!center) throw new Error("no existe el centro e2e-test");
    centerId = center.id;
    await prisma.centerZoomConfig.upsert({
      where: { centerId },
      update: { accessToken: "e2e-fake-access-token", enabled: true },
      create: { centerId, accessToken: "e2e-fake-access-token", enabled: true },
    });
  });

  test.afterAll(async () => {
    const prisma = await getE2EPrisma();
    await prisma.centerZoomConfig.deleteMany({ where: { centerId } });
  });

  test("marcar presencial → online genera el link solo (sin apretar botón)", async ({ page }) => {
    const prisma = await getE2EPrisma();
    const seed = await prisma.liveClass.create({
      data: {
        centerId,
        title: `E2E editar-online ${Date.now().toString(36)}`,
        startsAt: new Date(Date.now() + 24 * 3600 * 1000),
        durationMinutes: 60,
        maxCapacity: 10,
      },
    });

    let meetingCalls = 0;
    await page.route(`**/panel/horarios/${seed.id}`, async (route) => {
      const handled = await fulfillMeetingAction(route, {
        joinUrl: "https://zoom.us/j/E2E_EDIT_MOCKED_LINK",
        externalId: "E2E_EDIT_MOCKED_EXTERNAL_ID",
        provider: "zoom",
      });
      if (handled) {
        meetingCalls++;
        return;
      }
      await route.continue();
    });

    await page.goto(`/panel/horarios/${seed.id}`);
    await expect(page.getByRole("heading", { name: /Editar clase/i })).toBeVisible({ timeout: 10000 });

    await page.getByLabel("Clase online").check();

    // Nombre y fecha/hora ya vienen precargados: el link llega solo, sin click.
    await expect(page.getByText("Link de la reunión")).toBeVisible();
    await expect(page.locator("#meetingUrl")).toHaveValue("https://zoom.us/j/E2E_EDIT_MOCKED_LINK", {
      timeout: 5000,
    });

    expect(meetingCalls).toBeGreaterThan(0);
  });
});

test.describe("Editar clase — guarda online requiere link", () => {
  let centerId: string;

  test.beforeAll(async () => {
    const prisma = await getE2EPrisma();
    const center = await prisma.center.findUnique({ where: { slug: CENTER_SLUG } });
    if (!center) throw new Error("no existe el centro e2e-test");
    centerId = center.id;
    // Dos proveedores conectados → no hay auto-generado, se mantienen los
    // botones manuales, así que marcar "online" sin generar ni pegar un link
    // deja el form en el estado que la guarda debe bloquear.
    await prisma.centerZoomConfig.upsert({
      where: { centerId },
      update: { accessToken: "e2e-fake-access-token", enabled: true },
      create: { centerId, accessToken: "e2e-fake-access-token", enabled: true },
    });
    await prisma.centerGoogleMeetConfig.upsert({
      where: { centerId },
      update: { accessToken: "e2e-fake-access-token", enabled: true },
      create: { centerId, accessToken: "e2e-fake-access-token", enabled: true },
    });
  });

  test.afterAll(async () => {
    const prisma = await getE2EPrisma();
    await prisma.centerZoomConfig.deleteMany({ where: { centerId } });
    await prisma.centerGoogleMeetConfig.deleteMany({ where: { centerId } });
  });

  test("guardar online sin link muestra el error de la guarda", async ({ page }) => {
    const prisma = await getE2EPrisma();
    const seed = await prisma.liveClass.create({
      data: {
        centerId,
        title: `E2E editar-guarda ${Date.now().toString(36)}`,
        startsAt: new Date(Date.now() + 24 * 3600 * 1000),
        durationMinutes: 60,
        maxCapacity: 10,
      },
    });

    await page.goto(`/panel/horarios/${seed.id}`);
    await expect(page.getByRole("heading", { name: /Editar clase/i })).toBeVisible({ timeout: 10000 });

    await page.getByLabel("Clase online").check();
    await expect(page.getByRole("button", { name: "Generar con Zoom" })).toBeVisible();

    await page.getByRole("button", { name: /Guardar cambios/i }).click();

    await expect(
      page.getByText("Genera el link con el botón o pega uno manualmente.")
    ).toBeVisible();
    // No navegó: la guarda bloqueó el submit.
    await expect(page).toHaveURL(new RegExp(`/panel/horarios/${seed.id}$`));

    const after = await prisma.liveClass.findUnique({ where: { id: seed.id } });
    expect(after!.isOnline).toBe(false);
  });
});
