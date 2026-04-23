import { describe, it, expect } from "vitest";
import {
  ABOUT_IMAGE_CATEGORIES,
  ABOUT_IMAGE_CATEGORY_LABELS,
  groupImagesByCategory,
  type AboutImage,
} from "./about-page";

function img(partial: Partial<AboutImage>): AboutImage {
  return {
    id: "x",
    pageId: "p",
    imageUrl: "https://e.com/a.jpg",
    caption: null,
    category: "RETIROS",
    sortOrder: 0,
    visible: true,
    ...partial,
  };
}

describe("about-page domain", () => {
  it("exposes 3 canonical categories", () => {
    expect(ABOUT_IMAGE_CATEGORIES).toEqual(["RETIROS", "CLASES", "ESPACIO"]);
  });

  it("labels are in Spanish", () => {
    expect(ABOUT_IMAGE_CATEGORY_LABELS.RETIROS).toBe("Retiros");
    expect(ABOUT_IMAGE_CATEGORY_LABELS.CLASES).toBe("Clases");
    expect(ABOUT_IMAGE_CATEGORY_LABELS.ESPACIO).toBe("La sala");
  });

  describe("groupImagesByCategory", () => {
    it("groups images by category and sorts by sortOrder", () => {
      const result = groupImagesByCategory([
        img({ id: "1", category: "RETIROS", sortOrder: 1 }),
        img({ id: "2", category: "RETIROS", sortOrder: 0 }),
        img({ id: "3", category: "CLASES", sortOrder: 0 }),
      ]);
      expect(result.RETIROS.map((i) => i.id)).toEqual(["2", "1"]);
      expect(result.CLASES.map((i) => i.id)).toEqual(["3"]);
      expect(result.ESPACIO).toEqual([]);
    });

    it("hides invisible images", () => {
      const result = groupImagesByCategory([
        img({ id: "1", category: "RETIROS", visible: true }),
        img({ id: "2", category: "RETIROS", visible: false }),
      ]);
      expect(result.RETIROS.map((i) => i.id)).toEqual(["1"]);
    });

    it("returns empty arrays when no images", () => {
      const result = groupImagesByCategory([]);
      expect(result.RETIROS).toEqual([]);
      expect(result.CLASES).toEqual([]);
      expect(result.ESPACIO).toEqual([]);
    });
  });
});
