import { SITE_NAME } from "@/lib/constants/copy";
import { getSiteContext } from "@/lib/seo/metadata";

export interface SiteBranding {
  /** URL del logo configurado en /panel/sitio (Sanity CDN). null si el admin no subió. */
  logoUrl: string | null;
  /** Nombre del centro (default si no hay config). */
  centerName: string;
}

/**
 * Devuelve el logo + nombre del centro para los headers públicos.
 * Server-only: úsalo desde un Server Component / layout.
 * Nunca tira: si el centro o la config no existen, cae a `SITE_NAME` y `logoUrl: null`.
 */
export async function getPublicSiteBranding(): Promise<SiteBranding> {
  const fallback: SiteBranding = { logoUrl: null, centerName: SITE_NAME };
  const ctx = await getSiteContext();
  if (!ctx) return fallback;
  return {
    logoUrl: ctx.siteConfig?.logoUrl ?? null,
    centerName: ctx.center.name || SITE_NAME,
  };
}
