import { describe, it, expect } from "vitest";
import {
  SITE_NAME,
  TAGLINE,
  NAV_LINKS,
  CTAS,
} from "@/lib/constants/copy";

describe("copy", () => {
  it("expone SITE_NAME y TAGLINE", () => {
    expect(SITE_NAME).toBe("Cuerpo Raíz");
    expect(TAGLINE).toContain("cuerpo");
  });

  it("NAV_LINKS tiene enlaces esperados", () => {
    expect(NAV_LINKS.length).toBeGreaterThan(0);
    expect(NAV_LINKS[0]).toEqual({ href: "/#como-funciona", label: "Cómo funciona" });
  });

  it("CTAS tiene textos de llamada a la acción", () => {
    expect(CTAS.comenzarPractica).toBe("Comenzar a practicar");
    expect(CTAS.hablemos).toBe("Hablemos");
  });
});
