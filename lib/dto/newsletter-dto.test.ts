import { describe, it, expect } from "vitest";
import { subscribeNewsletterSchema } from "./newsletter-dto";

describe("subscribeNewsletterSchema", () => {
  it("acepta un email válido (recortado)", () => {
    expect(subscribeNewsletterSchema.parse({ email: "  ana@correo.cl " }).email).toBe("ana@correo.cl");
  });
  it("rechaza emails inválidos", () => {
    expect(subscribeNewsletterSchema.safeParse({ email: "no-es-mail" }).success).toBe(false);
    expect(subscribeNewsletterSchema.safeParse({}).success).toBe(false);
  });
});
