import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: { findById: vi.fn() },
  siteConfigRepository: { findByCenterId: vi.fn() },
}));

import {
  defaultBranding,
  getEmailBranding,
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_BRAND_SECONDARY,
} from "./branding";
import { centerRepository, siteConfigRepository } from "@/lib/adapters/db";

const findCenter = centerRepository.findById as ReturnType<typeof vi.fn>;
const findSite = siteConfigRepository.findByCenterId as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("defaultBranding", () => {
  it("retorna branding base con defaults seguros", () => {
    const b = defaultBranding();
    expect(b.centerName).toBe("Cuerpo Raíz");
    expect(b.colorPrimary).toBe(DEFAULT_BRAND_PRIMARY);
    expect(b.colorSecondary).toBe(DEFAULT_BRAND_SECONDARY);
    expect(b.timezone).toBe("America/Santiago");
    expect(b.logoUrl).toBeNull();
  });

  it("permite override del nombre del centro", () => {
    expect(defaultBranding("Otro Centro").centerName).toBe("Otro Centro");
  });
});

describe("getEmailBranding", () => {
  it("combina Center + CenterSiteConfig respetando hex válidos", async () => {
    findCenter.mockResolvedValue({ id: "c1", name: "Centro A", timezone: "America/Buenos_Aires" });
    findSite.mockResolvedValue({
      logoUrl: "https://cdn/logo.png",
      colorPrimary: "#123456",
      colorSecondary: "#abc",
      contactEmail: "hola@a.cl",
      contactPhone: "+56...",
      contactAddress: "Calle 1",
      whatsappUrl: "https://wa.me/x",
      instagramUrl: "https://ig/x",
    });
    const b = await getEmailBranding("c1");
    expect(b.centerName).toBe("Centro A");
    expect(b.timezone).toBe("America/Buenos_Aires");
    expect(b.logoUrl).toBe("https://cdn/logo.png");
    expect(b.colorPrimary).toBe("#123456");
    expect(b.colorSecondary).toBe("#abc");
    expect(b.contactEmail).toBe("hola@a.cl");
    expect(b.contactAddress).toBe("Calle 1");
  });

  it("aplica fallbacks cuando el color no es hex válido", async () => {
    findCenter.mockResolvedValue({ id: "c1", name: "X", timezone: "America/Santiago" });
    findSite.mockResolvedValue({ colorPrimary: "rojo", colorSecondary: "" });
    const b = await getEmailBranding("c1");
    expect(b.colorPrimary).toBe(DEFAULT_BRAND_PRIMARY);
    expect(b.colorSecondary).toBe(DEFAULT_BRAND_SECONDARY);
  });

  it("usa defaults si el centro no existe", async () => {
    findCenter.mockResolvedValue(null);
    findSite.mockResolvedValue(null);
    const b = await getEmailBranding("missing");
    expect(b.centerName).toBe("Cuerpo Raíz");
    expect(b.timezone).toBe("America/Santiago");
    expect(b.logoUrl).toBeNull();
    expect(b.colorPrimary).toBe(DEFAULT_BRAND_PRIMARY);
  });

  it("trim del hex y rechaza si tiene caracteres extra", async () => {
    findCenter.mockResolvedValue({ id: "c1", name: "X", timezone: "America/Santiago" });
    findSite.mockResolvedValue({ colorPrimary: "  #FF00FF  ", colorSecondary: "#bad-color" });
    const b = await getEmailBranding("c1");
    expect(b.colorPrimary).toBe("#FF00FF");
    expect(b.colorSecondary).toBe(DEFAULT_BRAND_SECONDARY);
  });
});
