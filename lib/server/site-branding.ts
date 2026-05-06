import { centerRepository, siteConfigRepository } from "@/lib/adapters/db";
import { SITE_NAME } from "@/lib/constants/copy";

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
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return fallback;
  try {
    const center = await centerRepository.findBySlug(slug);
    if (!center) return fallback;
    const config = await siteConfigRepository.findByCenterId(center.id);
    return {
      logoUrl: config?.logoUrl ?? null,
      centerName: center.name || SITE_NAME,
    };
  } catch {
    return fallback;
  }
}

/**
 * Devuelve el logo + nombre del centro para el panel admin (sesión activa).
 * Recibe `centerId` directo, sin depender del env del centro por defecto.
 */
export async function getCenterBranding(centerId: string): Promise<SiteBranding> {
  const fallback: SiteBranding = { logoUrl: null, centerName: SITE_NAME };
  try {
    const [center, config] = await Promise.all([
      centerRepository.findById(centerId),
      siteConfigRepository.findByCenterId(centerId),
    ]);
    if (!center) return fallback;
    return {
      logoUrl: config?.logoUrl ?? null,
      centerName: center.name || SITE_NAME,
    };
  } catch {
    return fallback;
  }
}
