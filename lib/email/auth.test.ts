import { describe, it, expect } from "vitest";
import {
  buildForgotPasswordEmail,
  buildEmailVerificationEmail,
} from "./auth";

const BASE = {
  toEmail: "alumna@example.com",
  centerName: "Cuerpo Raíz",
};

describe("buildForgotPasswordEmail", () => {
  it("retorna SendEmailDto con el destinatario, asunto y URL de reset", () => {
    const dto = buildForgotPasswordEmail({
      ...BASE,
      userName: "Trini",
      resetUrl: "https://app.example.com/reset?token=abc",
    });
    expect(dto.to).toEqual(["alumna@example.com"]);
    expect(dto.subject).toContain("Recupera tu contraseña");
    expect(dto.subject).toContain("Cuerpo Raíz");
    expect(dto.html).toContain("Hola Trini");
    expect(dto.html).toContain("Solicitaste recuperar tu contraseña");
    expect(dto.html).toContain("https://app.example.com/reset?token=abc");
    expect(dto.html).toContain("Este enlace expira en 1 hora");
    expect(dto.text).toContain("Trini");
    expect(dto.text).toContain("https://app.example.com/reset?token=abc");
  });

  it("usa 'Hola' genérico cuando no hay userName", () => {
    const dto = buildForgotPasswordEmail({
      ...BASE,
      resetUrl: "https://x/reset",
    });
    // HTML empieza con "Hola," (sin nombre)
    expect(dto.html).toContain("<p>Hola,</p>");
    expect(dto.text!.split("\n")[0]).toBe("Hola,");
  });

  it("escapa HTML en userName y centerName para prevenir inyección", () => {
    const dto = buildForgotPasswordEmail({
      toEmail: "x@example.com",
      userName: "<script>alert(1)</script>",
      centerName: "Raíz & Ruta \"yoga\"",
      resetUrl: "https://x/reset",
    });
    expect(dto.html).not.toContain("<script>alert(1)</script>");
    expect(dto.html).toContain("&lt;script&gt;");
    expect(dto.html).toContain("Raíz &amp; Ruta");
    expect(dto.html).toContain("&quot;yoga&quot;");
  });

  it("usa EMAIL_FROM si está definido en env, de lo contrario un default", () => {
    const dto = buildForgotPasswordEmail({
      ...BASE,
      resetUrl: "https://x/reset",
    });
    expect(dto.from).toBeTruthy();
    expect(typeof dto.from).toBe("string");
  });
});

describe("buildEmailVerificationEmail", () => {
  it("retorna SendEmailDto con asunto, CTA y URL de verificación", () => {
    const dto = buildEmailVerificationEmail({
      ...BASE,
      userName: "Trini",
      verifyUrl: "https://app.example.com/verify?token=xyz",
    });
    expect(dto.to).toEqual(["alumna@example.com"]);
    expect(dto.subject).toContain("Verifica tu email");
    expect(dto.subject).toContain("Cuerpo Raíz");
    expect(dto.html).toContain("Hola Trini");
    expect(dto.html).toContain("Confirma tu email");
    expect(dto.html).toContain("https://app.example.com/verify?token=xyz");
    expect(dto.html).toContain("Este enlace expira en 24 horas");
    expect(dto.text).toContain("Verificar email: https://app.example.com/verify?token=xyz");
  });

  it("saluda genérico cuando no hay userName", () => {
    const dto = buildEmailVerificationEmail({
      ...BASE,
      verifyUrl: "https://x/verify",
    });
    expect(dto.html).toContain("<p>Hola,</p>");
    expect(dto.text!.split("\n")[0]).toBe("Hola,");
  });

  it("escapa HTML en userName y centerName", () => {
    const dto = buildEmailVerificationEmail({
      toEmail: "x@example.com",
      userName: "<b>Evil</b>",
      centerName: "Centro & Co",
      verifyUrl: "https://x/verify",
    });
    expect(dto.html).not.toContain("<b>Evil</b>");
    expect(dto.html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
    expect(dto.html).toContain("Centro &amp; Co");
  });
});
