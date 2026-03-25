import { describe, it, expect } from "vitest";
import { upsertSiteConfigSchema, updateSiteSectionSchema, createSiteSectionItemSchema, reorderSchema } from "./site-config-dto";

describe("upsertSiteConfigSchema", () => {
  it("accepts valid config with hex colors", () => {
    const result = upsertSiteConfigSchema.safeParse({
      heroTitle: "Bienvenidos",
      colorPrimary: "#2D3B2A",
      colorSecondary: "#B85C38",
    });
    expect(result.success).toBe(true);
  });

  it("accepts 3-digit hex", () => {
    const result = upsertSiteConfigSchema.safeParse({ colorPrimary: "#FFF" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid hex color", () => {
    const result = upsertSiteConfigSchema.safeParse({ colorPrimary: "not-a-color" });
    expect(result.success).toBe(false);
  });

  it("rejects CSS injection in color", () => {
    const result = upsertSiteConfigSchema.safeParse({ colorPrimary: "#000; } body { display: none" });
    expect(result.success).toBe(false);
  });

  it("rejects non-https image URL", () => {
    const result = upsertSiteConfigSchema.safeParse({ heroImageUrl: "http://example.com/img.jpg" });
    expect(result.success).toBe(false);
  });

  it("accepts https image URL", () => {
    const result = upsertSiteConfigSchema.safeParse({ heroImageUrl: "https://example.com/img.jpg" });
    expect(result.success).toBe(true);
  });

  it("rejects javascript: URL", () => {
    const result = upsertSiteConfigSchema.safeParse({ logoUrl: "javascript:alert(1)" });
    expect(result.success).toBe(false);
  });

  it("accepts null values", () => {
    const result = upsertSiteConfigSchema.safeParse({ heroTitle: null, colorPrimary: null });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = upsertSiteConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("updateSiteSectionSchema", () => {
  it("accepts title and visible", () => {
    const result = updateSiteSectionSchema.safeParse({ title: "Equipo", visible: true });
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateSiteSectionSchema.safeParse({ visible: false });
    expect(result.success).toBe(true);
  });
});

describe("createSiteSectionItemSchema", () => {
  it("accepts valid item", () => {
    const result = createSiteSectionItemSchema.safeParse({
      title: "Trinidad Cáceres",
      description: "Profesora de yoga",
      imageUrl: "https://example.com/trini.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-https imageUrl", () => {
    const result = createSiteSectionItemSchema.safeParse({ imageUrl: "http://example.com/img.jpg" });
    expect(result.success).toBe(false);
  });
});

describe("reorderSchema", () => {
  it("accepts array of IDs", () => {
    const result = reorderSchema.safeParse({ orderedIds: ["id1", "id2", "id3"] });
    expect(result.success).toBe(true);
  });

  it("rejects empty IDs", () => {
    const result = reorderSchema.safeParse({ orderedIds: [""] });
    expect(result.success).toBe(false);
  });
});
