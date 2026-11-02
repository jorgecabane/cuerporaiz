import { describe, it, expect } from "vitest";
import {
  getPlanDisplayStatus,
  isPlanCurrent,
  lapsedPlanMessage,
  pickLapsedPlan,
  shouldSendExpiringNotice,
} from "./user-plan";

const DAY = 86_400_000;
const now = new Date("2026-11-02T15:00:00Z");

function plan(overrides: Partial<Parameters<typeof getPlanDisplayStatus>[0]> = {}) {
  return {
    status: "ACTIVE" as const,
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

describe("lapsedPlanMessage", () => {
  it("vencido → nombra el plan y la fecha en la zona del centro", () => {
    const msg = lapsedPlanMessage(
      { planName: "8 Clases al Mes", status: "EXPIRED", validUntil: new Date("2026-11-03T02:00:00Z") },
      "America/Santiago"
    );
    expect(msg).toBe("Tu plan 8 Clases al Mes venció el 2 de noviembre. Compra otro para seguir reservando.");
  });

  it("sin clases → lo dice y pide comprar otro", () => {
    const msg = lapsedPlanMessage(
      { planName: "4 Clases al Mes", status: "EXHAUSTED", validUntil: null },
      "America/Santiago"
    );
    expect(msg).toBe("Usaste todas las clases de tu plan 4 Clases al Mes. Compra otro para seguir reservando.");
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
