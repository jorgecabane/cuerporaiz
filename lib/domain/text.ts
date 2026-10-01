/** Separa un texto en párrafos por líneas en blanco (textareas del panel). */
export function splitParagraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
