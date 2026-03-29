import { describe, it, expect } from "vitest";
import { unlockLessonSchema } from "./lesson-unlock-dto";

describe("unlockLessonSchema", () => {
  it("acepta lessonId válido", () => {
    expect(unlockLessonSchema.safeParse({ lessonId: "clxxxxxxxxxxxxxxxxx" }).success).toBe(true);
  });
  it("rechaza lessonId vacío", () => {
    expect(unlockLessonSchema.safeParse({ lessonId: "" }).success).toBe(false);
  });
  it("rechaza sin lessonId", () => {
    expect(unlockLessonSchema.safeParse({}).success).toBe(false);
  });
});
