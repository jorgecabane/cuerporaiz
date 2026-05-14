/**
 * Resuelve la IANA timezone configurada en `Center.timezone`, con fallback
 * seguro a `"America/Santiago"`. Server-only — usa el repo de centros.
 *
 * Para emails se usa `getEmailBranding(centerId).timezone`, que internamente
 * resuelve el mismo campo. Esta utilidad es la equivalente para UI/server pages.
 */
import { centerRepository } from "@/lib/adapters/db";

export const DEFAULT_TIMEZONE = "America/Santiago";

export async function getCenterTimezone(
  centerId: string | null | undefined
): Promise<string> {
  if (!centerId) return DEFAULT_TIMEZONE;
  try {
    const center = await centerRepository.findById(centerId);
    return center?.timezone ?? DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Timezone del centro público por defecto (resolvido via env var). */
export async function getPublicCenterTimezone(): Promise<string> {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return DEFAULT_TIMEZONE;
  try {
    const center = await centerRepository.findBySlug(slug);
    return center?.timezone ?? DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
