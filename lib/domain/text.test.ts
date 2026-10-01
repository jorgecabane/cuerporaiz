import { describe, it, expect } from "vitest";
import { splitParagraphs } from "./text";

describe("splitParagraphs", () => {
  it("separa por líneas en blanco y conserva saltos simples dentro del párrafo", () => {
    expect(splitParagraphs("Uno.\n\nDos.\nsigue dos\n \n\nTres. ")).toEqual(["Uno.", "Dos.\nsigue dos", "Tres."]);
  });
  it("vacío o null → []", () => {
    expect(splitParagraphs(null)).toEqual([]);
    expect(splitParagraphs("  \n\n ")).toEqual([]);
  });
});
