import type { PortableTextBlock } from "@portabletext/types";

export function formatPostDate(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      timeZone: tz,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const WORDS_PER_MINUTE = 220;

/**
 * Cuenta palabras en un árbol PortableText. Ignora bloques custom.
 */
function countWordsInBlocks(blocks: PortableTextBlock[] | undefined): number {
  if (!Array.isArray(blocks)) return 0;
  let words = 0;
  for (const block of blocks) {
    if (block?._type === "block" && Array.isArray((block as { children?: unknown[] }).children)) {
      const children = (block as { children: Array<{ text?: string }> }).children;
      for (const child of children) {
        if (typeof child?.text === "string") {
          words += child.text.trim().split(/\s+/).filter(Boolean).length;
        }
      }
    }
  }
  return words;
}

export function estimateReadingMinutes(
  blocks: PortableTextBlock[] | undefined,
  fallback?: number,
): number {
  if (typeof fallback === "number" && fallback > 0) return fallback;
  const words = countWordsInBlocks(blocks);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
