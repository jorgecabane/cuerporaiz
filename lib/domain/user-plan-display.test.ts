import { describe, it, expect } from "vitest";
import {
  getPlanDisplayStatus,
  isPlanCurrent,
  noUsablePlanMessage,
  pickLapsedPlan,
  pickShownPlan,
  shouldSendExpiringNotice,
} from "./user-plan";

const DAY = 86_400_000;
const now = new Date("2026-11-02T15:00:00Z");

function plan(overrides: Partial<Parameters<typeof getPlanDisplayStatus>[0]> = {}) {
  return {
    status: "ACTIVE" as const,
    validFrom: new Date(now.getTime() - 10 * DAY),
    validUntil: new Date(now.getTime() + 20 * DAY),
    classesTotal: 8,
    classesUsed: 2,
    subscriptionId: null,
    ...overrides,
  };
}

describe("getPlanDisplayStatus", () => {
  it("vigente con clases y lejos del vencimiento → ACTIVE", () => {
    expect(getPlanDisplayStatus(plan(), now, 7)).toBe("ACTIVE");
  });

  it("pasó validUntil aunque queden clases → EXPIRED (caso: usó 6 de 8)", () => {
    const p = plan({ validUntil: new Date(now.getTime() - 1), classesUsed: 6 });
    expect(getPlanDisplayStatus(p, now, 7)).toBe("EXPIRED");
  });

  it("justo en validUntil todavía es vigente (igual que isUserPlanUsable)", () => {
    expect(getPlanDisplayStatus(plan({ validUntil: now }), now, 7)).toBe("EXPIRING_SOON");
  });

  it("en fecha pero sin clases → EXHAUSTED", () => {
    expect(getPlanDisplayStatus(plan({ classesUsed: 8 }), now, 7)).toBe("EXHAUSTED");
  });

  it("vencido y sin clases → EXPIRED (la fecha manda)", () => {
    const p = plan({ validUntil: new Date(now.getTime() - DAY), classesUsed: 8 });
    expect(getPlanDisplayStatus(p, now, 7)).toBe("EXPIRED");
  });

  it("vence dentro de los días de aviso → EXPIRING_SOON; fuera → ACTIVE", () => {
    const p = plan({ validUntil: new Date(now.getTime() + 5 * DAY) });
    expect(getPlanDisplayStatus(p, now, 7)).toBe("EXPIRING_SOON");
    expect(getPlanDisplayStatus(p, now, 3)).toBe("ACTIVE");
  });

  it("vence pronto cuenta días calendario en la zona del centro, igual que el correo", () => {
    // now = 2 nov 12:00 Santiago; vence el 9 nov 23:30 Santiago (7 días calendario, >7×24h).
    const p = plan({ validUntil: new Date("2026-11-09T23:30:00-03:00") });
    expect(getPlanDisplayStatus(p, now, 7, "America/Santiago")).toBe("EXPIRING_SOON");
    expect(getPlanDisplayStatus(p, now, 6, "America/Santiago")).toBe("ACTIVE");
  });

  it("usa 7 días por defecto", () => {
    expect(getPlanDisplayStatus(plan({ validUntil: new Date(now.getTime() + 5 * DAY) }), now)).toBe("EXPIRING_SOON");
  });

  it("todavía no empieza → UPCOMING (no sirve para reservar)", () => {
    const p = plan({ validFrom: new Date(now.getTime() + 3 * DAY), validUntil: new Date(now.getTime() + 33 * DAY) });
    expect(getPlanDisplayStatus(p, now, 7)).toBe("UPCOMING");
    expect(isPlanCurrent("UPCOMING")).toBe(false);
  });

  it("recurrente que vence pronto no avisa (se renueva solo)", () => {
    const p = plan({ validUntil: new Date(now.getTime() + 2 * DAY), subscriptionId: "sub" });
    expect(getPlanDisplayStatus(p, now, 7)).toBe("ACTIVE");
  });

  it("ilimitado y sin vencimiento → ACTIVE", () => {
    expect(getPlanDisplayStatus(plan({ classesTotal: null, validUntil: null }), now, 7)).toBe("ACTIVE");
  });

  it.each(["FROZEN", "CANCELLED", "EXPIRED"] as const)("estado guardado %s se respeta", (status) => {
    expect(getPlanDisplayStatus(plan({ status, validUntil: new Date(now.getTime() - DAY) }), now, 7)).toBe(status);
  });
});

describe("isPlanCurrent", () => {
  it("solo ACTIVE y EXPIRING_SOON sirven para reservar", () => {
    expect(isPlanCurrent("ACTIVE")).toBe(true);
    expect(isPlanCurrent("EXPIRING_SOON")).toBe(true);
    for (const s of ["EXPIRED", "EXHAUSTED", "FROZEN", "CANCELLED"] as const) expect(isPlanCurrent(s)).toBe(false);
  });
});

describe("pickLapsedPlan", () => {
  const older = { ...plan({ validUntil: new Date(now.getTime() - 40 * DAY) }), id: "older", createdAt: new Date(now.getTime() - 70 * DAY) };
  const newer = { ...plan({ validUntil: new Date(now.getTime() - DAY) }), id: "newer", createdAt: new Date(now.getTime() - 31 * DAY) };

  it("devuelve el plan caducado más reciente", () => {
    expect(pickLapsedPlan([older, newer], now)?.id).toBe("newer");
  });

  it("incluye planes sin clases en fecha", () => {
    const exhausted = { ...plan({ classesUsed: 8 }), id: "ex", createdAt: now };
    expect(pickLapsedPlan([older, exhausted], now)?.id).toBe("ex");
  });

  it("ignora planes cancelados/congelados/vencidos a mano y vigentes", () => {
    const cancelled = { ...plan({ status: "CANCELLED", validUntil: new Date(now.getTime() - DAY) }), id: "c", createdAt: now };
    const current = { ...plan(), id: "cur", createdAt: now };
    expect(pickLapsedPlan([cancelled, current], now)).toBeNull();
  });
});

describe("pickShownPlan", () => {
  const mk = (id: string, o: Partial<Parameters<typeof getPlanDisplayStatus>[0]> = {}) => ({
    ...plan(o),
    id,
    createdAt: now,
  });

  it("prefiere el plan vigente", () => {
    const shown = pickShownPlan([mk("old", { validUntil: new Date(now.getTime() - DAY) }), mk("cur")], now);
    expect(shown?.plan.id).toBe("cur");
    expect(shown?.status).toBe("ACTIVE");
  });

  it("sin vigente, muestra el que viene antes que el vencido", () => {
    const upcoming = mk("next", { validFrom: new Date(now.getTime() + 3 * DAY), validUntil: new Date(now.getTime() + 33 * DAY) });
    const shown = pickShownPlan([mk("old", { validUntil: new Date(now.getTime() - DAY) }), upcoming], now);
    expect(shown).toMatchObject({ plan: { id: "next" }, status: "UPCOMING" });
  });

  it("sin vigente ni próximo, muestra el último vencido; sin nada → null", () => {
    expect(pickShownPlan([mk("old", { validUntil: new Date(now.getTime() - DAY) })], now)?.status).toBe("EXPIRED");
    expect(pickShownPlan([], now)).toBeNull();
  });
});

describe("noUsablePlanMessage", () => {
  const TZ = "America/Santiago";
  const named = (o: Partial<Parameters<typeof getPlanDisplayStatus>[0]>, planName = "8 Clases al Mes") => ({
    ...plan(o),
    createdAt: now,
    planName,
  });
  const expired = named({ validUntil: new Date("2026-11-01T18:00:00-03:00"), classesUsed: 6 });

  it("vencido → nombra el plan y la fecha en la zona del centro", () => {
    expect(noUsablePlanMessage([expired], now, TZ)).toBe(
      "Tu plan 8 Clases al Mes venció el 1 de noviembre. Compra otro para seguir reservando."
    );
  });

  it("sin clases → lo dice y pide comprar otro", () => {
    expect(noUsablePlanMessage([named({ classesUsed: 8 }, "4 Clases")], now, TZ)).toBe(
      "Usaste todas las clases de tu plan 4 Clases. Compra otro para seguir reservando."
    );
  });

  it("si tiene un plan que aún no empieza, avisa la fecha y no pide comprar", () => {
    const next = named({ validFrom: new Date("2026-11-10T09:00:00-03:00"), validUntil: new Date("2026-12-10T09:00:00-03:00") }, "Plan Diciembre");
    expect(noUsablePlanMessage([expired, next], now, TZ)).toBe("Tu plan Plan Diciembre empieza el 10 de noviembre.");
  });

  it("sin planes → mensaje genérico con punto final", () => {
    expect(noUsablePlanMessage([], now, TZ)).toBe("No tienes un plan activo para reservar clases.");
  });

  it("reservando el admin por un alumno → habla del alumno, no le pide comprar", () => {
    expect(noUsablePlanMessage([expired], now, TZ, { onBehalfOfStudent: true })).toBe(
      "El plan 8 Clases al Mes del alumno venció el 1 de noviembre."
    );
    expect(noUsablePlanMessage([named({ classesUsed: 8 })], now, TZ, { onBehalfOfStudent: true })).toBe(
      "El alumno usó todas las clases de su plan 8 Clases al Mes."
    );
    expect(noUsablePlanMessage([], now, TZ, { onBehalfOfStudent: true })).toBe(
      "El alumno no tiene un plan activo para reservar clases."
    );
  });
});

describe("shouldSendExpiringNotice", () => {
  // now = 2026-11-02 12:00 en Santiago (UTC-3). El cron corre una vez al día.
  const TZ = "America/Santiago";
  const base = { classesTotal: 8, classesUsed: 2, subscriptionId: null };
  const at = (iso: string) => ({ ...base, validUntil: new Date(iso) });

  it("avisa si el plan vence exactamente N días calendario después (en la zona del centro)", () => {
    expect(shouldSendExpiringNotice(at("2026-11-09T23:30:00-03:00"), now, 7, TZ)).toBe(true);
    expect(shouldSendExpiringNotice(at("2026-11-09T00:10:00-03:00"), now, 7, TZ)).toBe(true);
  });

  it("un día antes o después no avisa: cada plan cae en una sola corrida diaria", () => {
    expect(shouldSendExpiringNotice(at("2026-11-08T23:59:00-03:00"), now, 7, TZ)).toBe(false);
    expect(shouldSendExpiringNotice(at("2026-11-10T00:01:00-03:00"), now, 7, TZ)).toBe(false);
  });

  it("respeta los días configurados por el centro", () => {
    expect(shouldSendExpiringNotice(at("2026-11-05T18:00:00-03:00"), now, 3, TZ)).toBe(true);
    expect(shouldSendExpiringNotice(at("2026-11-05T18:00:00-03:00"), now, 7, TZ)).toBe(false);
  });

  it("sin clases restantes o recurrente → no avisa", () => {
    const p = at("2026-11-09T12:00:00-03:00");
    expect(shouldSendExpiringNotice({ ...p, classesUsed: 8 }, now, 7, TZ)).toBe(false);
    expect(shouldSendExpiringNotice({ ...p, subscriptionId: "s" }, now, 7, TZ)).toBe(false);
  });
});
