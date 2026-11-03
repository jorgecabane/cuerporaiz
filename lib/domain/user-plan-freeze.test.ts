import { describe, it, expect } from "vitest";
import { validUntilAfterFreeze } from "./user-plan";

const DAY = 86_400_000;
const frozenAt = new Date("2026-11-01T15:00:00Z");
const now = new Date(frozenAt.getTime() + 10 * DAY);
const validUntil = new Date("2026-11-20T15:00:00Z");

describe("validUntilAfterFreeze", () => {
  it("corre la fecha de término en el tiempo que estuvo congelado", () => {
    const result = validUntilAfterFreeze({ validUntil, frozenAt, subscriptionId: null }, now);
    expect(result).toEqual(new Date(validUntil.getTime() + 10 * DAY));
  });

  it("no toca planes sin fecha de término", () => {
    expect(validUntilAfterFreeze({ validUntil: null, frozenAt, subscriptionId: null }, now)).toBeNull();
  });

  it("no toca planes de suscripción (el ciclo lo maneja MercadoPago)", () => {
    expect(validUntilAfterFreeze({ validUntil, frozenAt, subscriptionId: "sub" }, now)).toEqual(validUntil);
  });

  it("no toca planes sin fecha de congelamiento", () => {
    expect(validUntilAfterFreeze({ validUntil, frozenAt: null, subscriptionId: null }, now)).toEqual(validUntil);
  });
});
