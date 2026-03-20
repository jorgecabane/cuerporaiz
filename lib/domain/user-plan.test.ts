import { describe, it, expect } from "vitest";
import { isUserPlanUsable, classesRemaining } from "./user-plan";

function makeUserPlan(overrides: Partial<Parameters<typeof isUserPlanUsable>[0]> = {}) {
  return {
    id: "up",
    userId: "u",
    planId: "p",
    centerId: "c",
    orderId: null,
    subscriptionId: null,
    status: "ACTIVE" as const,
    paymentStatus: "PAID" as const,
    classesTotal: 10,
    classesUsed: 0,
    validFrom: new Date("2026-01-01T00:00:00Z"),
    validUntil: new Date("2026-12-31T00:00:00Z"),
    frozenAt: null,
    frozenUntil: null,
    freezeReason: null,
    unfrozenAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("isUserPlanUsable", () => {
  it("true cuando el plan está ACTIVE y tiene clases disponibles", () => {
    expect(
      isUserPlanUsable(makeUserPlan({ classesTotal: 10, classesUsed: 3 }))
    ).toBe(true);
  });

  it("false cuando la vigencia aún no parte", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(
      isUserPlanUsable(
        makeUserPlan({
          classesTotal: null,
          classesUsed: 0,
          validFrom: new Date("2026-02-01T00:00:00Z"),
          validUntil: null,
        }),
        now
      )
    ).toBe(false);
  });

  it("false cuando ya venció", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    expect(
      isUserPlanUsable(
        makeUserPlan({
          classesTotal: null,
          classesUsed: 0,
          validUntil: new Date("2026-02-01T00:00:00Z"),
        }),
        now
      )
    ).toBe(false);
  });

  it("false cuando está ACTIVE pero no tiene clases", () => {
    expect(
      isUserPlanUsable(makeUserPlan({ classesTotal: 3, classesUsed: 3 }))
    ).toBe(false);
  });

  it("true cuando classesTotal es null (ilimitado) y está ACTIVE", () => {
    expect(
      isUserPlanUsable(makeUserPlan({ classesTotal: null, classesUsed: 999, validUntil: null }))
    ).toBe(true);
  });
});

describe("classesRemaining", () => {
  it("null si classesTotal es null", () => {
    expect(
      classesRemaining({
        ...makeUserPlan({ classesTotal: null, classesUsed: 999, validUntil: null }),
      })
    ).toBe(null);
  });

  it("nunca baja de 0", () => {
    expect(
      classesRemaining({
        ...makeUserPlan({ classesTotal: 3, classesUsed: 10, validUntil: null }),
      })
    ).toBe(0);
  });
});

