/**
 * Resuelve el branding de un centro para usar en correos.
 * Combina datos de Center + CenterSiteConfig y aplica defaults seguros.
 */
import { centerRepository, siteConfigRepository } from "@/lib/adapters/db";

export interface EmailBranding {
  centerId: string;
  centerName: string;
  /** IANA timezone (ej. "America/Santiago"). */
  timezone: string;
  /** URL absoluta del logo (PNG/JPG). null → fallback texto. */
  logoUrl: string | null;
  /** Color primario hex (#RRGGBB). Header + énfasis. */
  colorPrimary: string;
  /** Color secundario hex. Botones CTA. */
  colorSecondary: string;
  /** Email de contacto del centro. Para footer + replyTo. */
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  whatsappUrl: string | null;
  instagramUrl: string | null;
}

export const DEFAULT_BRAND_PRIMARY = "#2D3B2A";
export const DEFAULT_BRAND_SECONDARY = "#B85C38";

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function safeHex(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return HEX_RE.test(value.trim()) ? value.trim() : fallback;
}

export async function getEmailBranding(centerId: string): Promise<EmailBranding> {
  const [center, site] = await Promise.all([
    centerRepository.findById(centerId),
    siteConfigRepository.findByCenterId(centerId),
  ]);
  return {
    centerId,
    centerName: center?.name ?? "Cuerpo Raíz",
    timezone: center?.timezone ?? "America/Santiago",
    logoUrl: site?.logoUrl ?? null,
    colorPrimary: safeHex(site?.colorPrimary, DEFAULT_BRAND_PRIMARY),
    colorSecondary: safeHex(site?.colorSecondary, DEFAULT_BRAND_SECONDARY),
    contactEmail: site?.contactEmail ?? null,
    contactPhone: site?.contactPhone ?? null,
    contactAddress: site?.contactAddress ?? null,
    whatsappUrl: site?.whatsappUrl ?? null,
    instagramUrl: site?.instagramUrl ?? null,
  };
}

/** Branding mínimo cuando no podemos resolverlo (ej. usuario sin centro). */
export function defaultBranding(centerName = "Cuerpo Raíz"): EmailBranding {
  return {
    centerId: "",
    centerName,
    timezone: "America/Santiago",
    logoUrl: null,
    colorPrimary: DEFAULT_BRAND_PRIMARY,
    colorSecondary: DEFAULT_BRAND_SECONDARY,
    contactEmail: null,
    contactPhone: null,
    contactAddress: null,
    whatsappUrl: null,
    instagramUrl: null,
  };
}
