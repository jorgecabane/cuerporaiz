import { describe, it, expect } from "vitest";
import { createCheckoutBodySchema } from "./checkout-dto";

describe("checkout-dto schemas", () => {

  it("createCheckoutBodySchema requiere planId", () => {
    const parsed = createCheckoutBodySchema.parse({ planId: "ckn2j3p7v0000g1m9abcd1234" });
    expect(parsed.planId).toMatch(/^[a-z0-9]+$/i);
  });
});

