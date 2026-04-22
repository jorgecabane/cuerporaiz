import { describe, it, expect } from "vitest";
import { escapeHtml, plainTextToHtmlParagraphs } from "./utils";

describe("escapeHtml", () => {
  it("escapa los 5 caracteres HTML peligrosos", () => {
    expect(escapeHtml("a & b < c > d \" e ' f")).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &#39; f",
    );
  });

  it("devuelve la cadena vacía sin cambios", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("no toca texto seguro", () => {
    expect(escapeHtml("Hola, ¿cómo estás?")).toBe("Hola, ¿cómo estás?");
  });
});

describe("plainTextToHtmlParagraphs", () => {
  it("retorna vacío si el input está vacío o solo whitespace", () => {
    expect(plainTextToHtmlParagraphs("")).toBe("");
    expect(plainTextToHtmlParagraphs("   \n\n  ")).toBe("");
  });

  it("crea un párrafo por cada bloque separado por líneas en blanco", () => {
    const input = "Recuerda traer toalla.\n\nY tu propia esterilla.";
    expect(plainTextToHtmlParagraphs(input)).toBe(
      "<p>Recuerda traer toalla.</p><p>Y tu propia esterilla.</p>",
    );
  });

  it("convierte saltos simples en <br> dentro del mismo párrafo", () => {
    expect(plainTextToHtmlParagraphs("Línea 1\nLínea 2")).toBe(
      "<p>Línea 1<br>Línea 2</p>",
    );
  });

  it("escapa HTML inyectado por el admin", () => {
    expect(plainTextToHtmlParagraphs("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });
});
