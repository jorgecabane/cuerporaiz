import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { checkRateLimit } from "@/lib/application/check-rate-limit";
import { requestEmailVerification } from "@/lib/application/request-email-verification";
import { authTokenRepository, loginAttemptRepository, centerRepository, userRepository, prisma } from "@/lib/adapters/db";
import { buildEmailVerificationEmail } from "@/lib/email/auth";
import { sendEmailSafe } from "@/lib/application/send-email";
import { getEmailBranding, defaultBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";

const publicBodySchema = z.object({
  email: z.string().email("Email inválido"),
  centerId: z.string().min(1, "Centro requerido"),
});

/**
 * Reenvía verificación de email. Dos modos:
 *
 *  1. Autenticado (banner del panel) — usa session.user.{id,email,centerId}.
 *  2. Público (pantalla de "verifica tu email" tras login bloqueado por C6) —
 *     acepta { email, centerId } en el body. Responde 200 siempre para no
 *     filtrar si el email existe; rate-limit por (email, centerId).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    let userId: string;
    let email: string;
    let centerId: string;

    if (session?.user?.id) {
      userId = session.user.id;
      email = session.user.email;
      centerId = session.user.centerId;
    } else {
      const raw = await request.json().catch(() => null);
      const parsed = publicBodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const center =
        (await centerRepository.findBySlug(parsed.data.centerId)) ??
        (await centerRepository.findById(parsed.data.centerId));
      if (!center) {
        // No revelamos si centro existe; respondemos OK genérico.
        return NextResponse.json({ success: true }, { status: 200 });
      }
      const user = await userRepository.findByEmail(parsed.data.email);
      if (!user) {
        return NextResponse.json({ success: true }, { status: 200 });
      }
      userId = user.id;
      email = user.email;
      centerId = center.id;
    }

    const rateLimit = await checkRateLimit({
      key: { email, centerId },
      maxAttempts: 3,
      windowMinutes: 60,
      repo: loginAttemptRepository,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { code: "RATE_LIMITED", retryAfter: rateLimit.retryAfterSeconds },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerifiedAt: true },
    });
    if (user?.emailVerifiedAt) {
      // Modo autenticado: devolvemos 400 (UI del banner lo entiende).
      // Modo público: respondemos 200 igual para no filtrar el estado.
      if (session?.user?.id) {
        return NextResponse.json({ code: "ALREADY_VERIFIED" }, { status: 400 });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const token = await requestEmailVerification(userId, authTokenRepository);

    const center =
      (await centerRepository.findBySlug(centerId)) ??
      (await centerRepository.findById(centerId));
    const baseUrl = getBaseUrl();
    const branding = center ? await getEmailBranding(center.id) : defaultBranding();

    sendEmailSafe(
      buildEmailVerificationEmail({
        toEmail: email,
        verifyUrl: `${baseUrl}/auth/verify-email?token=${token}`,
        branding,
      })
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[resend-verification]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al reenviar verificación" },
      { status: 500 }
    );
  }
}
