import { describe, it, expect } from "vitest";
import { buildShareText, shareLinks } from "./social-urls";

const URL = "https://cuerporaiz.cl/blog/las-hojas-caen";
const TITLE = "Las hojas caen, y las estructuras también";

describe("buildShareText", () => {
  it("agrega el nombre del sitio al título", () => {
    expect(buildShareText(TITLE)).toBe(`${TITLE} — Cuerpo Raíz`);
  });
});

describe("shareLinks", () => {
  const text = buildShareText(TITLE);

  it("WhatsApp incluye texto + url codificados en wa.me", () => {
    const link = shareLinks.whatsapp(URL, text);
    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
    expect(link).toContain(encodeURIComponent(URL));
    expect(link).toContain(encodeURIComponent("Cuerpo Raíz"));
  });

  it("Facebook usa el sharer con la url codificada", () => {
    expect(shareLinks.facebook(URL)).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL)}`,
    );
  });

  it("X usa intent/tweet con url y text", () => {
    const link = shareLinks.x(URL, text);
    expect(link.startsWith("https://x.com/intent/tweet?")).toBe(true);
    expect(link).toContain(`url=${encodeURIComponent(URL)}`);
    expect(link).toContain(`text=${encodeURIComponent(text)}`);
  });

  it("Email arma un mailto con subject (texto) y body (url)", () => {
    expect(shareLinks.email(URL, text)).toBe(
      `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(URL)}`,
    );
  });

  it("escapa caracteres especiales del título (no rompe el query string)", () => {
    const link = shareLinks.x(URL, "a&b=c?d");
    expect(link).toContain(encodeURIComponent("a&b=c?d"));
    expect(link).not.toContain("a&b=c?d");
  });
});
