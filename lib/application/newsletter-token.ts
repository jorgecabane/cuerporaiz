import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "@/lib/domain/newsletter";

/**
 * Token firmado para darse de baja del newsletter sin iniciar sesión.
 * Determinístico por (centro, email): no se guarda en la BD.
 */
function secret(): string {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET no configurado");
  return value;
}

export function newsletterToken(centerId: string, email: string): string {
  return createHmac("sha256", secret())
    .update(`newsletter-unsubscribe:${centerId}:${normalizeEmail(email)}`)
    .digest("base64url");
}

export function verifyNewsletterToken(centerId: string, email: string, token: string): boolean {
  const expected = Buffer.from(newsletterToken(centerId, email));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function buildUnsubscribeUrl(baseUrl: string, centerId: string, email: string): string {
  const params = new URLSearchParams({ e: normalizeEmail(email), t: newsletterToken(centerId, email) });
  return `${baseUrl}/newsletter/baja?${params.toString()}`;
}
