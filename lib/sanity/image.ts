import { createImageUrlBuilder } from "@sanity/image-url";
import { dataset, projectId } from "@/sanity/env";

type SanityImageSource = Parameters<ReturnType<typeof createImageUrlBuilder>["image"]>[0];

const builder = projectId ? createImageUrlBuilder({ projectId, dataset }) : null;

/**
 * Construye una URL optimizada desde una imagen de Sanity.
 * Retorna `null` si Sanity no está configurado o la fuente es inválida.
 */
export function urlForImage(source: SanityImageSource | null | undefined): string | null {
  if (!builder || !source) return null;
  try {
    return builder.image(source).auto("format").fit("max").url();
  } catch {
    return null;
  }
}

/**
 * Variante con ancho fijo (útil para <Image> con width/height y srcset).
 */
export function urlForImageWithWidth(
  source: SanityImageSource | null | undefined,
  width: number,
): string | null {
  if (!builder || !source) return null;
  try {
    return builder.image(source).width(width).auto("format").fit("max").url();
  } catch {
    return null;
  }
}

/**
 * Agrega query params a una URL del CDN de Sanity (host `cdn.sanity.io`).
 * Para cualquier otro host devuelve la URL original sin tocar.
 * Si la URL no parsea, devuelve el string original.
 */
export function withSanityImageParams(
  url: string,
  params: Record<string, string | number>,
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== "cdn.sanity.io") return url;
  for (const [key, value] of Object.entries(params)) {
    parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
}
