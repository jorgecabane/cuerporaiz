import { describe, it, expect } from "vitest";
import { emailBaseLayout, EMAIL_CTA_STYLE } from "./base-layout";

describe("emailBaseLayout", () => {
  it("wraps body content in branded HTML structure", () => {
    const html = emailBaseLayout({
      body: "<p>Hello world</p>",
      centerName: "Cuerpo Raíz",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<p>Hello world</p>");
    expect(html).toContain("Cuerpo Raíz");
  });

  it("uses cream background color #F5F0E9", () => {
    const html = emailBaseLayout({ body: "<p>Test</p>", centerName: "Test" });
    expect(html).toContain("#F5F0E9");
  });

  it("exports CTA button style with secondary color", () => {
    expect(EMAIL_CTA_STYLE).toContain("#B85C38");
  });

  it("includes footer with center name", () => {
    const html = emailBaseLayout({ body: "<p>Test</p>", centerName: "Mi Centro" });
    expect(html).toContain("Mi Centro");
  });

  it("includes email preferences link when provided", () => {
    const html = emailBaseLayout({
      body: "<p>Test</p>",
      centerName: "Test",
      preferencesUrl: "https://app.com/panel/mi-perfil?tab=correos",
    });
    expect(html).toContain("mi-perfil?tab=correos");
    expect(html).toContain("Preferencias de correo");
  });
});
