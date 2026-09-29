import { describe, it, expect } from "vitest";
import { safeCallbackUrl } from "./auth-redirect";

describe("safeCallbackUrl", () => {
  it("acepta rutas relativas", () => {
    expect(safeCallbackUrl("/panel/tienda?plan=1")).toBe("/panel/tienda?plan=1");
  });
  it("rechaza URLs externas o vacías", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/panel");
    expect(safeCallbackUrl("//evil.com")).toBe("/panel");
    expect(safeCallbackUrl("/\\evil.com")).toBe("/panel");
    expect(safeCallbackUrl(null)).toBe("/panel");
    expect(safeCallbackUrl(undefined, "/x")).toBe("/x");
  });
});
