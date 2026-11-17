import { cache } from "react";
import { centerRepository } from "@/lib/adapters/db";

/** Centro de las páginas públicas (`NEXT_PUBLIC_DEFAULT_CENTER_SLUG`), o null si no está configurado. */
export const getDefaultCenter = cache(async () => {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  return slug ? centerRepository.findBySlug(slug) : null;
});
