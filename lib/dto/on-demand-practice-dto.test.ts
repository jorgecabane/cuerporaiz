import { describe, it, expect } from "vitest";
import { createPracticeSchema, updatePracticeSchema } from "./on-demand-practice-dto";

describe("createPracticeSchema", () => {
  it("acepta datos válidos", () => {
    expect(createPracticeSchema.safeParse({ name: "Hatha Yoga" }).success).toBe(true);
  });

  it("acepta con todos los campos", () => {
    expect(
      createPracticeSchema.safeParse({
        name: "Hatha",
        description: "Clase de hatha",
        thumbnailUrl: "https://example.com/img.jpg",
        status: "PUBLISHED",
      }).success
    ).toBe(true);
  });

  it("requiere nombre", () => {
    expect(createPracticeSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rechaza thumbnailUrl sin https", () => {
    expect(
      createPracticeSchema.safeParse({ name: "X", thumbnailUrl: "http://example.com/img.jpg" }).success
    ).toBe(false);
  });

  it("rechaza status inválido", () => {
    expect(createPracticeSchema.safeParse({ name: "X", status: "ARCHIVED" }).success).toBe(false);
  });
});

describe("updatePracticeSchema", () => {
  it("acepta actualización parcial", () => {
    expect(updatePracticeSchema.safeParse({ name: "Nuevo nombre" }).success).toBe(true);
  });

  it("acepta objeto vacío", () => {
    expect(updatePracticeSchema.safeParse({}).success).toBe(true);
  });

  it("acepta nullable description", () => {
    expect(updatePracticeSchema.safeParse({ description: null }).success).toBe(true);
  });
});
