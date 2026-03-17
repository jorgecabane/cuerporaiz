import { describe, it, expect } from "vitest";
import { createPreferenceDtoSchema, createCheckoutBodySchema } from "./checkout-dto";

describe("checkout-dto schemas", () => {
  it("createPreferenceDtoSchema valida URLs y campos obligatorios", () => {
    const parsed = createPreferenceDtoSchema.parse({
      accessToken: "token",
      title: "Plan",
      quantity: 1,
      unitPrice: 1000,
      externalReference: "ord_1",
      backUrls: {
        success: "https://example.com/success",
        failure: "https://example.com/failure",
        pending: "https://example.com/pending",
      },
      notificationUrl: "https://example.com/webhook",
      autoReturn: "approved",
      payerEmail: "a@b.com",
    });
    expect(parsed.autoReturn).toBe("approved");
  });

  it("createCheckoutBodySchema requiere planId", () => {
    const parsed = createCheckoutBodySchema.parse({ planId: "ckn2j3p7v0000g1m9abcd1234" });
    expect(parsed.planId).toMatch(/^[a-z0-9]+$/i);
  });
});

