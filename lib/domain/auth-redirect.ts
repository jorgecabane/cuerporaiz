/** Solo acepta rutas relativas del mismo sitio (evita open redirects como "//evil.com"). */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/panel"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
