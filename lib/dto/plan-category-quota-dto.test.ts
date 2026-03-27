import { describe, it, expect } from "vitest";
import { quotaItemSchema, upsertQuotasSchema } from "./plan-category-quota-dto";

describe("quotaItemSchema", () => {
  it("acepta datos válidos", () => {
    expect(quotaItemSchema.safeParse({ categoryId: "cat-1", maxLessons: 5 }).success).toBe(true);
  });

  it("rechaza maxLessons 0", () => {
    expect(quotaItemSchema.safeParse({ categoryId: "cat-1", maxLessons: 0 }).success).toBe(false);
  });

  it("rechaza maxLessons negativo", () => {
    expect(quotaItemSchema.safeParse({ categoryId: "cat-1", maxLessons: -1 }).success).toBe(false);
  });

  it("rechaza categoryId vacío", () => {
    expect(quotaItemSchema.safeParse({ categoryId: "", maxLessons: 5 }).success).toBe(false);
  });

  it("rechaza maxLessons decimal", () => {
    expect(quotaItemSchema.safeParse({ categoryId: "cat-1", maxLessons: 1.5 }).success).toBe(false);
  });
});

describe("upsertQuotasSchema", () => {
  it("acepta array de quotas", () => {
    expect(
      upsertQuotasSchema.safeParse({
        quotas: [
          { categoryId: "cat-1", maxLessons: 4 },
          { categoryId: "cat-2", maxLessons: 2 },
        ],
      }).success
    ).toBe(true);
  });

  it("acepta array vacío", () => {
    expect(upsertQuotasSchema.safeParse({ quotas: [] }).success).toBe(true);
  });

  it("rechaza sin quotas", () => {
    expect(upsertQuotasSchema.safeParse({}).success).toBe(false);
  });
});
