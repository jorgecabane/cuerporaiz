/**
 * Rate limit best-effort para el checkout guest (sin login), por IP.
 *
 * Es en memoria (por instancia): en serverless no es global, pero corta el
 * abuso barato de creación masiva de usuarios desde una misma IP. La unicidad
 * de email ya evita duplicar usuarios al reintentar con el mismo correo.
 */
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_PER_WINDOW = 8;
const hitsByIp = new Map<string, number[]>();

export function allowGuestCheckout(ip: string | null | undefined): boolean {
  if (!ip) return true;
  const now = Date.now();
  const recent = (hitsByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hitsByIp.set(ip, recent);
    return false;
  }
  recent.push(now);
  hitsByIp.set(ip, recent);
  return true;
}
