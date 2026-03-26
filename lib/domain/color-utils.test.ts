import { describe, it, expect } from "vitest";
import { sanitizeHexColor, hexToRgb, darkenHex, lightenHex } from "./color-utils";

describe("sanitizeHexColor", () => {
  it("accepts valid 6-digit hex", () => {
    expect(sanitizeHexColor("#2D3B2A", "#000000")).toBe("#2D3B2A");
  });
  it("accepts valid 3-digit hex", () => {
    expect(sanitizeHexColor("#FFF", "#000000")).toBe("#FFF");
  });
  it("returns fallback for null/undefined", () => {
    expect(sanitizeHexColor(null, "#2D3B2A")).toBe("#2D3B2A");
    expect(sanitizeHexColor(undefined, "#2D3B2A")).toBe("#2D3B2A");
  });
  it("returns fallback for invalid hex", () => {
    expect(sanitizeHexColor("not-a-color", "#2D3B2A")).toBe("#2D3B2A");
  });
  it("returns fallback for CSS injection attempt", () => {
    expect(sanitizeHexColor("#000; } body { display: none } :root {", "#2D3B2A")).toBe("#2D3B2A");
  });
  it("returns fallback for empty string", () => {
    expect(sanitizeHexColor("", "#2D3B2A")).toBe("#2D3B2A");
  });
});

describe("hexToRgb", () => {
  it("converts 6-digit hex to RGB string", () => {
    expect(hexToRgb("#2D3B2A")).toBe("45, 59, 42");
  });
  it("converts 3-digit hex to RGB string", () => {
    expect(hexToRgb("#FFF")).toBe("255, 255, 255");
  });
  it("handles lowercase", () => {
    expect(hexToRgb("#ff0000")).toBe("255, 0, 0");
  });
});

describe("darkenHex", () => {
  it("darkens a color by given percentage", () => {
    const result = darkenHex("#FFFFFF", 10);
    expect(result).toBe("#e6e6e6");
  });
  it("does not go below #000000", () => {
    const result = darkenHex("#010101", 99);
    expect(result).toBe("#000000");
  });
});

describe("lightenHex", () => {
  it("lightens a color by given percentage", () => {
    const result = lightenHex("#000000", 10);
    expect(result).toBe("#1a1a1a");
  });
  it("does not go above #FFFFFF", () => {
    const result = lightenHex("#fefefe", 99);
    expect(result).toBe("#ffffff");
  });
});
