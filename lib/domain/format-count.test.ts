import { describe, it, expect } from "vitest";
import { formatCount } from "./format-count";

describe("formatCount", () => {
  it("usa singular solo para 1", () => {
    expect(formatCount(1, "clase", "clases")).toBe("1 clase");
    expect(formatCount(0, "clase", "clases")).toBe("0 clases");
    expect(formatCount(3, "práctica", "prácticas")).toBe("3 prácticas");
  });
});
