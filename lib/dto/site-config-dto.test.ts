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

  describe("blogEnabled + blogLabel", () => {
    it("accepts blogEnabled true + blogLabel", () => {
      const result = upsertSiteConfigSchema.safeParse({
        blogEnabled: true,
        blogLabel: "Diario",
      });
      expect(result.success).toBe(true);
    });

    it("accepts blogEnabled false alone", () => {
      const result = upsertSiteConfigSchema.safeParse({ blogEnabled: false });
      expect(result.success).toBe(true);
    });

    it("rejects empty blogLabel", () => {
      const result = upsertSiteConfigSchema.safeParse({ blogLabel: "" });
      expect(result.success).toBe(false);
    });

    it("rejects blogLabel longer than 40 chars", () => {
      const result = upsertSiteConfigSchema.safeParse({ blogLabel: "a".repeat(41) });
      expect(result.success).toBe(false);
    });

    it("trims whitespace from blogLabel", () => {
      const result = upsertSiteConfigSchema.safeParse({ blogLabel: "  Blog  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.blogLabel).toBe("Blog");
      }
    });

    it("rejects non-boolean blogEnabled", () => {
      const result = upsertSiteConfigSchema.safeParse({ blogEnabled: "yes" });
      expect(result.success).toBe(false);
    });
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

  it("accepts free text in linkUrl (labels, tags, etc.)", () => {
    const result = createSiteSectionItemSchema.safeParse({ linkUrl: "Packs online" });
    expect(result.success).toBe(true);
  });

  describe("href", () => {
    it.each([
      ["/#agenda", "internal anchor"],
      ["/planes", "internal path"],
      ["/sobre", "internal path"],
      ["https://example.com/foo", "https URL"],
      ["http://example.com", "http URL"],
      ["mailto:hola@ejemplo.cl", "mailto link"],
      ["tel:+56912345678", "tel link"],
    ])("accepts %s (%s)", (href) => {
      const result = createSiteSectionItemSchema.safeParse({ href });
      expect(result.success).toBe(true);
    });

    it.each([
      ["javascript:alert(1)"],
      ["not-a-url"],
      ["ftp://example.com"],
      ["data:text/html;base64,PHA+"],
    ])("rejects %s", (href) => {
      const result = createSiteSectionItemSchema.safeParse({ href });
      expect(result.success).toBe(false);
    });

    it("accepts null", () => {
      const result = createSiteSectionItemSchema.safeParse({ href: null });
      expect(result.success).toBe(true);
    });

    it("transforms empty string to null", () => {
      const result = createSiteSectionItemSchema.safeParse({ href: "" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.href).toBe(null);
    });

    it("rejects strings longer than 500 chars", () => {
      const result = createSiteSectionItemSchema.safeParse({
        href: "/" + "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });
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
