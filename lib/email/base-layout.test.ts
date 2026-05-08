import { describe, it, expect } from "vitest";
import { emailBaseLayout, emailCtaStyle, EMAIL_CTA_STYLE } from "./base-layout";
import { defaultBranding } from "./branding";

describe("emailBaseLayout", () => {
  const branding = defaultBranding("Cuerpo Raíz");

  it("wraps body content in branded HTML structure", () => {
    const html = emailBaseLayout({ body: "<p>Hello world</p>", branding });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<p>Hello world</p>");
    expect(html).toContain("Cuerpo Raíz");
  });

  it("uses cream background color #F5F0E9", () => {
    const html = emailBaseLayout({ body: "<p>Test</p>", branding });
    expect(html).toContain("#F5F0E9");
  });

  it("emailCtaStyle uses provided secondary color", () => {
    expect(emailCtaStyle("#FF0000")).toContain("#FF0000");
    expect(EMAIL_CTA_STYLE).toContain("#B85C38");
  });

  it("renders logo + center name together when logoUrl is set", () => {
    const html = emailBaseLayout({
      body: "<p>x</p>",
      branding: { ...branding, logoUrl: "https://cdn.test/logo.png" },
    });
    expect(html).toContain('<img src="https://cdn.test/logo.png"');
    // El nombre sigue presente al lado del logo
    expect(html).toContain("Cuerpo Raíz");
  });

  it("renders text-only header when no logo", () => {
    const html = emailBaseLayout({ body: "<p>x</p>", branding });
    expect(html).toContain("Cuerpo Raíz");
    expect(html).not.toContain("<img");
  });

  it("applies brand primary color to header strip", () => {
    const html = emailBaseLayout({
      body: "<p>x</p>",
      branding: { ...branding, colorPrimary: "#123456" },
    });
    expect(html).toContain("border-top:3px solid #123456");
  });

  it("includes contact info in footer when present", () => {
    const html = emailBaseLayout({
      body: "<p>x</p>",
      branding: {
        ...branding,
        contactAddress: "Av. Pucón 555",
        contactEmail: "hola@test.cl",
      },
    });
    expect(html).toContain("Av. Pucón 555");
    expect(html).toContain("hola@test.cl");
  });

  it("includes preferences link when provided", () => {
    const html = emailBaseLayout({
      body: "<p>x</p>",
      branding,
      preferencesUrl: "https://app.com/panel/mi-perfil?tab=correos",
    });
    expect(html).toContain("mi-perfil?tab=correos");
    expect(html).toContain("Preferencias de correo");
  });

  it("omits preferences block when not provided", () => {
    const html = emailBaseLayout({ body: "<p>x</p>", branding });
    expect(html).not.toContain("Preferencias de correo");
  });

  it("renders contact phone in footer when present", () => {
    const html = emailBaseLayout({
      body: "<p>x</p>",
      branding: { ...branding, contactPhone: "+56 9 1234 5678" },
    });
    expect(html).toContain("+56 9 1234 5678");
  });

  it("renders Instagram and WhatsApp links when present", () => {
    const html = emailBaseLayout({
      body: "<p>x</p>",
      branding: {
        ...branding,
        instagramUrl: "https://instagram.com/x",
        whatsappUrl: "https://wa.me/56...",
      },
    });
    expect(html).toContain('href="https://instagram.com/x"');
    expect(html).toContain("Instagram");
    expect(html).toContain('href="https://wa.me/56..."');
    expect(html).toContain("WhatsApp");
  });

  it("omits contact and social blocks when fully empty", () => {
    const html = emailBaseLayout({ body: "<p>x</p>", branding });
    // Sin contact info ni redes, no aparecen secciones extra del footer.
    expect(html).not.toContain("Instagram");
    expect(html).not.toContain("WhatsApp");
    expect(html).not.toContain("mailto:");
  });

  it("falls back to defaultBranding when branding is null at runtime", () => {
    // Type-cast porque el tipo requiere branding, pero el runtime tiene `?? defaultBranding()` por seguridad.
    const html = emailBaseLayout({
      body: "<p>x</p>",
      branding: null as unknown as ReturnType<typeof defaultBranding>,
    });
    expect(html).toContain("Cuerpo Raíz");
  });
});
