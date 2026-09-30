import { describe, it, expect } from "vitest";
import { buildBlogPostPublishedEmail } from "./blog";
import { defaultBranding } from "./branding";

const BRANDING = defaultBranding("Cuerpo Raíz");

describe("buildBlogPostPublishedEmail", () => {
  it("genera email completo con imagen, categoría, tiempo y autor", () => {
    const result = buildBlogPostPublishedEmail({
      toEmail: "test@example.com",
      userName: "Camila",
      postTitle: "Cómo respirar mejor",
      excerpt: "Una guía simple para conectar respiración y movimiento.",
      coverImageUrl: "https://cdn.sanity.io/images/abc/portada.jpg",
      categoryName: "Yoga",
      readingMinutes: 5,
      authorName: "María González",
      postUrl: "https://cuerporaiz.cl/blog/como-respirar-mejor",
      branding: BRANDING,
    });

    expect(result.subject).toBe("Nueva entrada en el blog: Cómo respirar mejor");
    expect(result.to).toEqual(["test@example.com"]);
    expect(result.html).toContain("Cómo respirar mejor");
    expect(result.html).toContain("conectar respiración");
    expect(result.html).toContain("portada.jpg");
    expect(result.html).toContain("YOGA");
    expect(result.html).toContain("5 min de lectura");
    expect(result.html).toContain("María González");
    expect(result.html).toContain("https://cuerporaiz.cl/blog/como-respirar-mejor");
    expect(result.text).toContain("Camila");
    expect(result.text).toContain("https://cuerporaiz.cl/blog/como-respirar-mejor");
  });

  it("omite imagen, categoría, tiempo y autor cuando faltan", () => {
    const result = buildBlogPostPublishedEmail({
      toEmail: "test@example.com",
      postTitle: "Entrada mínima",
      excerpt: "Texto.",
      postUrl: "https://cuerporaiz.cl/blog/minima",
      branding: BRANDING,
    });

    expect(result.html).toContain("Entrada mínima");
    expect(result.html).not.toContain("<img");
    expect(result.html).not.toContain("min de lectura");
    expect(result.html).not.toContain("por ");
    expect(result.text).toContain("Hola,");
  });

  it("escapa HTML del título y extracto (XSS)", () => {
    const result = buildBlogPostPublishedEmail({
      toEmail: "test@example.com",
      postTitle: "<script>alert(1)</script>",
      excerpt: "<img src=x onerror=alert(2)>",
      postUrl: "https://cuerporaiz.cl/blog/x",
      branding: BRANDING,
    });

    expect(result.html).not.toContain("<script>alert(1)</script>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).not.toContain("<img src=x onerror");
  });

  it("incluye el link de baja (escapado) y lo omite si no se pasa", () => {
    const base = {
      toEmail: "ana@correo.cl",
      postTitle: "Post",
      excerpt: "Resumen",
      postUrl: "https://cuerporaiz.cl/blog/post",
      branding: defaultBranding(),
    };
    const withLink = buildBlogPostPublishedEmail({
      ...base,
      unsubscribeUrl: "https://cuerporaiz.cl/newsletter/baja?e=ana%40correo.cl&t=abc",
    });
    expect(withLink.html).toContain("Dejar de recibir novedades del blog");
    expect(withLink.html).toContain("/newsletter/baja?e=ana%40correo.cl&amp;t=abc");
    expect(withLink.text).toContain("Dejar de recibir novedades del blog: https://cuerporaiz.cl/newsletter/baja");

    const without = buildBlogPostPublishedEmail(base);
    expect(without.html).not.toContain("Dejar de recibir");
  });
});
