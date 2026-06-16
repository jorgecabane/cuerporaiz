import { describe, it, expect } from "vitest";
import { guestCheckoutBodySchema } from "./guest-checkout-dto";

describe("guestCheckoutBodySchema", () => {
  it("acepta datos válidos y normaliza email + trim", () => {
    const result = guestCheckoutBodySchema.safeParse({
      name: "  Camila Rojas ",
      email: "  Camila@Correo.CL ",
      phone: " +56 9 1234 5678 ",
      quantity: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("camila@correo.cl");
      expect(result.data.name).toBe("Camila Rojas");
      expect(result.data.phone).toBe("+56 9 1234 5678");
      expect(result.data.quantity).toBe(2);
    }
  });

  it("rechaza email inválido", () => {
    const result = guestCheckoutBodySchema.safeParse({
      name: "Camila",
      email: "no-es-email",
      phone: "+56912345678",
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre muy corto", () => {
    const result = guestCheckoutBodySchema.safeParse({
      name: "C",
      email: "c@correo.cl",
      phone: "+56912345678",
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza teléfono muy corto", () => {
    const result = guestCheckoutBodySchema.safeParse({
      name: "Camila",
      email: "c@correo.cl",
      phone: "123",
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity menor a 1 o no entero", () => {
    expect(
      guestCheckoutBodySchema.safeParse({ name: "Camila", email: "c@correo.cl", phone: "+56912345678", quantity: 0 }).success
    ).toBe(false);
    expect(
      guestCheckoutBodySchema.safeParse({ name: "Camila", email: "c@correo.cl", phone: "+56912345678", quantity: 1.5 }).success
    ).toBe(false);
  });
});
