import { describe, it, expect } from "vitest";
import {
  upsertAboutPageSchema,
  createAboutImageSchema,
  updateAboutImageSchema,
  reorderAboutImagesSchema,
} from "./about-page-dto";

describe("upsertAboutPageSchema", () => {
  it("accepts empty object", () => {
    const res = upsertAboutPageSchema.safeParse({});
    expect(res.success).toBe(true);
  });

  it("accepts full payload", () => {
    const res = upsertAboutPageSchema.safeParse({
      visible: true,
      showInHeader: true,
      headerLabel: "Sobre Trini",
      pageTitle: "Sobre Trinidad",
      name: "Trinidad",
      tagline: "Un espacio para el cuerpo",
      heroImageUrl: "https://example.com/trini.jpg",
      bio: "Hola mundo",
      propuesta: "Mi propuesta",
      ctaLabel: "Reserva",
      ctaHref: "/#agenda",
    });
    expect(res.success).toBe(true);
  });

  it("rejects http:// hero image (only https allowed)", () => {
    const res = upsertAboutPageSchema.safeParse({
      heroImageUrl: "http://insecure.com/img.jpg",
    });
    expect(res.success).toBe(false);
  });

  it("transforms empty hero image to null", () => {
    const res = upsertAboutPageSchema.safeParse({ heroImageUrl: "" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.heroImageUrl).toBe(null);
  });

  it("accepts internal anchor as ctaHref", () => {
    const res = upsertAboutPageSchema.safeParse({ ctaHref: "/#agenda" });
    expect(res.success).toBe(true);
  });

  it("rejects javascript: in ctaHref", () => {
    const res = upsertAboutPageSchema.safeParse({ ctaHref: "javascript:alert(1)" });
    expect(res.success).toBe(false);
  });

  it("rejects bio longer than 10k chars", () => {
    const res = upsertAboutPageSchema.safeParse({ bio: "a".repeat(10_001) });
    expect(res.success).toBe(false);
  });
});

describe("createAboutImageSchema", () => {
  it("accepts valid image with caption", () => {
    const res = createAboutImageSchema.safeParse({
      imageUrl: "https://cdn.com/foo.jpg",
      caption: "Retiro de invierno",
      category: "RETIROS",
    });
    expect(res.success).toBe(true);
  });

  it("accepts image without caption", () => {
    const res = createAboutImageSchema.safeParse({
      imageUrl: "https://cdn.com/foo.jpg",
      category: "CLASES",
    });
    expect(res.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const res = createAboutImageSchema.safeParse({
      imageUrl: "https://cdn.com/foo.jpg",
      category: "UNKNOWN",
    });
    expect(res.success).toBe(false);
  });

  it("rejects http:// URL", () => {
    const res = createAboutImageSchema.safeParse({
      imageUrl: "http://insecure.com/img.jpg",
      category: "ESPACIO",
    });
    expect(res.success).toBe(false);
  });
});

describe("updateAboutImageSchema", () => {
  it("accepts partial update (caption only)", () => {
    const res = updateAboutImageSchema.safeParse({ caption: "nueva caption" });
    expect(res.success).toBe(true);
  });

  it("accepts visible toggle", () => {
    const res = updateAboutImageSchema.safeParse({ visible: false });
    expect(res.success).toBe(true);
  });
});

describe("reorderAboutImagesSchema", () => {
  it("requires category + orderedIds", () => {
    const ok = reorderAboutImagesSchema.safeParse({
      category: "RETIROS",
      orderedIds: ["a", "b", "c"],
    });
    expect(ok.success).toBe(true);

    const fail = reorderAboutImagesSchema.safeParse({ orderedIds: ["a"] });
    expect(fail.success).toBe(false);
  });
});
