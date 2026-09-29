import { describe, it, expect } from "vitest";
import { formatSpotsAvailable, spotsFillRatio } from "./spots";

describe("formatSpotsAvailable", () => {
  it("muestra libres sobre el total", () => {
    expect(formatSpotsAvailable(7, 10)).toBe("7 de 10 cupos disponibles");
  });
  it("muestra Completo sin cupos (o sobrevendida)", () => {
    expect(formatSpotsAvailable(0, 10)).toBe("Completo");
    expect(formatSpotsAvailable(-1, 10)).toBe("Completo");
  });
});

describe("spotsFillRatio", () => {
  it("calcula la proporción ocupada", () => {
    expect(spotsFillRatio(7, 10)).toBeCloseTo(0.3);
    expect(spotsFillRatio(10, 10)).toBe(0);
  });
  it("se acota entre 0 y 1", () => {
    expect(spotsFillRatio(-2, 10)).toBe(1);
    expect(spotsFillRatio(12, 10)).toBe(0);
    expect(spotsFillRatio(0, 0)).toBe(1);
  });
});
