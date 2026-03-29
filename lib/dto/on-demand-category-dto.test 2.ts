import { describe, it, expect } from "vitest";
import { createCategorySchema, updateCategorySchema } from "./on-demand-category-dto";

describe("createCategorySchema", () => {
  it("acepta datos válidos", () => {
    const result = createCategorySchema.safeParse({
      name: "Yoga",
      description: "Clases de yoga grabadas",
      thumbnailUrl: "https://example.com/yoga.jpg",
      status: "DRAFT",
    });
    expect(result.success).toBe(true);
  });
  it("requiere nombre", () => {
    expect(createCategorySchema.safeParse({ name: "" }).success).toBe(false);
  });
  it("nombre mínimo 1 carácter", () => {
    expect(createCategorySchema.safeParse({ name: "Y" }).success).toBe(true);
  });
  it("rechaza thumbnailUrl sin https", () => {
    expect(createCategorySchema.safeParse({ name: "Yoga", thumbnailUrl: "http://example.com/yoga.jpg" }).success).toBe(false);
  });
  it("acepta thumbnailUrl con https", () => {
    expect(createCategorySchema.safeParse({ name: "Yoga", thumbnailUrl: "https://example.com/yoga.jpg" }).success).toBe(true);
  });
  it("acepta status DRAFT o PUBLISHED", () => {
    expect(createCategorySchema.safeParse({ name: "X", status: "DRAFT" }).success).toBe(true);
    expect(createCategorySchema.safeParse({ name: "X", status: "PUBLISHED" }).success).toBe(true);
  });
  it("rechaza status inválido", () => {
    expect(createCategorySchema.safeParse({ name: "X", status: "ARCHIVED" }).success).toBe(false);
  });
  it("campos opcionales son opcionales", () => {
    expect(createCategorySchema.safeParse({ name: "Yoga" }).success).toBe(true);
  });
});

describe("updateCategorySchema", () => {
  it("acepta actualización parcial", () => {
    expect(updateCategorySchema.safeParse({ name: "Yoga Avanzado" }).success).toBe(true);
  });
  it("acepta objeto vacío", () => {
    expect(updateCategorySchema.safeParse({}).success).toBe(true);
  });
});
