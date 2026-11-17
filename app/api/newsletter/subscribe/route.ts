import { NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/application/newsletter";
import { memoryRateLimit } from "@/lib/application/memory-rate-limit";
import { subscribeNewsletterSchema } from "@/lib/dto/newsletter-dto";
import { getClientIp } from "@/lib/utils/client-ip";
import { getDefaultCenter } from "@/lib/server/default-center";

const MAX_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;

/** Suscripción pública al newsletter del blog (solo email). */
export async function POST(request: Request) {
  const ip = getClientIp(request) ?? "unknown";
  if (!memoryRateLimit(`newsletter:${ip}`, MAX_PER_WINDOW, WINDOW_MS).allowed) {
    return NextResponse.json({ code: "RATE_LIMITED", message: "Demasiados intentos. Prueba en unos minutos." }, { status: 429 });
  }

  const parsed = subscribeNewsletterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_EMAIL", message: "Ingresa un email válido." }, { status: 400 });
  }
  // Honeypot: respondemos OK para no darle pistas al bot.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const center = await getDefaultCenter();
  if (!center) return NextResponse.json({ code: "NOT_CONFIGURED" }, { status: 500 });

  await subscribeToNewsletter(center.id, parsed.data.email);
  return NextResponse.json({ ok: true });
}
