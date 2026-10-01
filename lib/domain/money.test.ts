import { describe, it, expect } from "vitest";
import { formatMoney, formatPriceOrFree } from "./money";

describe("formatMoney", () => {
  it("CLP con separador de miles y sin decimales", () => {
    expect(formatMoney(15990, "CLP")).toBe("$15.990");
    expect(formatMoney(1200000)).toBe("$1.200.000");
  });
  it("otras monedas: centavos a unidades con 2 decimales", () => {
    expect(formatMoney(1999, "USD")).toBe("19.99 USD");
  });
});

describe("formatPriceOrFree", () => {
  it("0 es Gratis", () => {
    expect(formatPriceOrFree(0, "CLP")).toBe("Gratis");
    expect(formatPriceOrFree(5000, "CLP")).toBe("$5.000");
  });
});
