import { describe, it, expect, beforeAll } from "vitest";
import { newsletterToken, verifyNewsletterToken, buildUnsubscribeUrl } from "./newsletter-token";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret";
});

describe("newsletter token", () => {
  it("verifica el token del mismo centro y email (sin importar mayúsculas)", () => {
    const token = newsletterToken("c1", "Ana@Correo.cl");
    expect(verifyNewsletterToken("c1", "ana@correo.cl", token)).toBe(true);
  });

  it("rechaza token de otro email, otro centro o manipulado", () => {
    const token = newsletterToken("c1", "ana@correo.cl");
    expect(verifyNewsletterToken("c1", "otra@correo.cl", token)).toBe(false);
    expect(verifyNewsletterToken("c2", "ana@correo.cl", token)).toBe(false);
    expect(verifyNewsletterToken("c1", "ana@correo.cl", token.slice(1))).toBe(false);
    expect(verifyNewsletterToken("c1", "ana@correo.cl", "")).toBe(false);
  });

  it("arma el link de baja con email y token", () => {
    const url = new URL(buildUnsubscribeUrl("https://cuerporaiz.cl", "c1", "Ana@Correo.cl"));
    expect(url.pathname).toBe("/newsletter/baja");
    expect(url.searchParams.get("e")).toBe("ana@correo.cl");
    expect(verifyNewsletterToken("c1", "ana@correo.cl", url.searchParams.get("t")!)).toBe(true);
  });
});
