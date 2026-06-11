/**
 * Builders puros de URLs para compartir una entrada del blog en redes.
 * Sin dependencias: testeables de forma aislada.
 */

const SITE_NAME = "Cuerpo Raíz";

/** Texto base para compartir (título + nombre del sitio). */
export function buildShareText(title: string): string {
  return `${title} — ${SITE_NAME}`;
}

export const shareLinks = {
  whatsapp: (url: string, text: string): string =>
    `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  facebook: (url: string): string =>
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  x: (url: string, text: string): string =>
    `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  email: (url: string, text: string): string =>
    `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
} as const;

export type ShareChannel = keyof typeof shareLinks;
