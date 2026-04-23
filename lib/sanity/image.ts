import imageUrlBuilder from "@sanity/image-url";
import { dataset, projectId } from "@/sanity/env";

type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>["image"]>[0];

const builder = projectId ? imageUrlBuilder({ projectId, dataset }) : null;

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
