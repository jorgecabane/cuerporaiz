import { describe, it, expect } from "vitest";
import {
  ABOUT_IMAGE_CATEGORIES,
  ABOUT_IMAGE_CATEGORY_LABELS,
} from "./about-page";

describe("about-page domain", () => {
  it("exposes 3 canonical categories", () => {
    expect(ABOUT_IMAGE_CATEGORIES).toEqual(["RETIROS", "CLASES", "ESPACIO"]);
  });

  it("labels are in Spanish", () => {
    expect(ABOUT_IMAGE_CATEGORY_LABELS.RETIROS).toBe("Retiros");
    expect(ABOUT_IMAGE_CATEGORY_LABELS.CLASES).toBe("Clases");
    expect(ABOUT_IMAGE_CATEGORY_LABELS.ESPACIO).toBe("La sala");
  });
});
