import { describe, it, expect } from "vitest";
import {
  SITE_NAME,
  TAGLINE,
  DEFAULT_NAV,
  CTAS,
} from "@/lib/constants/copy";

describe("copy", () => {
  it("expone SITE_NAME y TAGLINE", () => {
    expect(SITE_NAME).toBe("Cuerpo Raíz");
    expect(TAGLINE).toContain("cuerpo");
  });

  it("DEFAULT_NAV agrupa Practica y termina en Contacto", () => {
    expect(DEFAULT_NAV.map((i) => i.label)).toEqual(["Practica", "Contacto"]);
  });

  it("CTAS tiene textos de llamada a la acción", () => {
    expect(CTAS.comenzarPractica).toBe("Comenzar a practicar");
    expect(CTAS.hablemos).toBe("Hablemos");
  });
});
