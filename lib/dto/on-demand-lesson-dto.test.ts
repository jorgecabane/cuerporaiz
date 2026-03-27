import { describe, it, expect } from "vitest";
import { createLessonSchema, updateLessonSchema } from "./on-demand-lesson-dto";

describe("createLessonSchema", () => {
  it("acepta datos válidos completos", () => {
    expect(createLessonSchema.safeParse({
      practiceId: "clxxxxxxxxxxxxxxxxx",
      title: "Hatha Yoga — Nivel 1",
      videoUrl: "https://vimeo.com/123456789",
      description: "Clase introductoria",
      durationMinutes: 45,
      level: "Principiante",
    }).success).toBe(true);
  });
  it("requiere title", () => {
    expect(createLessonSchema.safeParse({ practiceId: "clx", title: "", videoUrl: "https://vimeo.com/123" }).success).toBe(false);
  });
  it("requiere videoUrl", () => {
    expect(createLessonSchema.safeParse({ practiceId: "clx", title: "Clase" }).success).toBe(false);
  });
  it("rechaza videoUrl sin https", () => {
    expect(createLessonSchema.safeParse({ practiceId: "clx", title: "Clase", videoUrl: "http://vimeo.com/123" }).success).toBe(false);
  });
  it("requiere practiceId", () => {
    expect(createLessonSchema.safeParse({ title: "Clase", videoUrl: "https://vimeo.com/123" }).success).toBe(false);
  });
  it("durationMinutes debe ser entero positivo", () => {
    const base = { practiceId: "clx", title: "C", videoUrl: "https://vimeo.com/1" };
    expect(createLessonSchema.safeParse({ ...base, durationMinutes: 0 }).success).toBe(false);
    expect(createLessonSchema.safeParse({ ...base, durationMinutes: -5 }).success).toBe(false);
    expect(createLessonSchema.safeParse({ ...base, durationMinutes: 1.5 }).success).toBe(false);
    expect(createLessonSchema.safeParse({ ...base, durationMinutes: 60 }).success).toBe(true);
  });
  it("rechaza promoVideoUrl sin https", () => {
    expect(createLessonSchema.safeParse({ practiceId: "clx", title: "Clase", videoUrl: "https://vimeo.com/123", promoVideoUrl: "http://youtube.com/watch" }).success).toBe(false);
  });
});

describe("updateLessonSchema", () => {
  it("acepta actualización parcial", () => {
    expect(updateLessonSchema.safeParse({ title: "Nuevo título" }).success).toBe(true);
  });
  it("acepta objeto vacío", () => {
    expect(updateLessonSchema.safeParse({}).success).toBe(true);
  });
});
