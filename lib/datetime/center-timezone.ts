/**
 * Resuelve la IANA timezone configurada en `Center.timezone`, con fallback
 * seguro a `"America/Santiago"`. Server-only — usa el repo de centros.
 *
 * Para emails se usa `getEmailBranding(centerId).timezone`, que internamente
 * resuelve el mismo campo. Esta utilidad es la equivalente para UI/server pages.
 */
import { centerRepository } from "@/lib/adapters/db";
import { getSiteContext } from "@/lib/seo/metadata";

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
  const ctx = await getSiteContext();
  return ctx?.center.timezone ?? DEFAULT_TIMEZONE;
}
