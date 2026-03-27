import { describe, it, expect } from "vitest";
import {
  buildLessonUnlockedEmail,
  buildQuotaExhaustedEmail,
  buildNewContentEmail,
} from "./on-demand";

describe("buildLessonUnlockedEmail", () => {
  it("genera email con remaining lessons", () => {
    const result = buildLessonUnlockedEmail({
      toEmail: "test@example.com",
      userName: "María",
      lessonTitle: "Hatha principiantes",
      practiceName: "Hatha Yoga",
      categoryName: "Yoga",
      remainingLessons: 3,
      onDemandUrl: "https://example.com/panel/replay",
    });

    expect(result.subject).toBe("Desbloqueaste: Hatha principiantes");
    expect(result.to).toEqual(["test@example.com"]);
    expect(result.html).toContain("Hatha principiantes");
    expect(result.html).toContain("Hatha Yoga");
    expect(result.html).toContain("3");
    expect(result.text).toContain("María");
    expect(result.text).toContain("3 clases de Yoga");
  });

  it("genera email sin remaining (ilimitado)", () => {
    const result = buildLessonUnlockedEmail({
      toEmail: "test@example.com",
      lessonTitle: "Clase X",
      practiceName: "Práctica Y",
      categoryName: "Cat Z",
      remainingLessons: null,
      onDemandUrl: "https://example.com/panel/replay",
    });

    expect(result.html).toContain("Clase X");
    expect(result.html).not.toContain("clases de Cat Z");
    expect(result.text).toContain("Hola,");
  });

  it("genera greeting sin nombre", () => {
    const result = buildLessonUnlockedEmail({
      toEmail: "test@example.com",
      lessonTitle: "Clase",
      practiceName: "P",
      categoryName: "C",
      remainingLessons: null,
      onDemandUrl: "https://example.com",
    });

    expect(result.text).toContain("Hola,");
  });
});

describe("buildQuotaExhaustedEmail", () => {
  it("genera email con categoria y link a tienda", () => {
    const result = buildQuotaExhaustedEmail({
      toEmail: "test@example.com",
      userName: "Pedro",
      categoryName: "Yoga",
      storeUrl: "https://example.com/tienda",
    });

    expect(result.subject).toBe("Usaste todas tus clases de Yoga");
    expect(result.to).toEqual(["test@example.com"]);
    expect(result.html).toContain("Yoga");
    expect(result.html).toContain("tienda");
    expect(result.text).toContain("Pedro");
  });

  it("genera greeting sin nombre", () => {
    const result = buildQuotaExhaustedEmail({
      toEmail: "test@example.com",
      categoryName: "Yoga",
      storeUrl: "https://example.com/tienda",
    });

    expect(result.text).toContain("Hola,");
  });
});

describe("buildNewContentEmail", () => {
  it("genera email con leccion y link a catalogo", () => {
    const result = buildNewContentEmail({
      toEmail: "test@example.com",
      userName: "Ana",
      lessonTitle: "Vinyasa matinal",
      practiceName: "Vinyasa Flow",
      catalogUrl: "https://example.com/catalogo",
    });

    expect(result.subject).toBe("Nueva clase disponible: Vinyasa matinal");
    expect(result.to).toEqual(["test@example.com"]);
    expect(result.html).toContain("Vinyasa matinal");
    expect(result.html).toContain("Vinyasa Flow");
    expect(result.text).toContain("Ana");
  });

  it("genera greeting sin nombre", () => {
    const result = buildNewContentEmail({
      toEmail: "test@example.com",
      lessonTitle: "Clase",
      practiceName: "P",
      catalogUrl: "https://example.com",
    });

    expect(result.text).toContain("Hola,");
  });
});
