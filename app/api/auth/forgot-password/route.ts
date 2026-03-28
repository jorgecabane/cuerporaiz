import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/dto/auth-token-dto";
import { requestPasswordReset } from "@/lib/application/request-password-reset";
import { checkRateLimit } from "@/lib/application/check-rate-limit";
import { authTokenRepository, loginAttemptRepository, userRepository, centerRepository } from "@/lib/adapters/db";
import { buildForgotPasswordEmail } from "@/lib/email/auth";
import { sendEmailSafe } from "@/lib/application/send-email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, centerId } = parsed.data;
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";

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

    await loginAttemptRepository.create({ email, centerId, ip, success: false });

    const result = await requestPasswordReset(email, centerId, {
      tokenRepo: authTokenRepository,
      userRepo: userRepository,
    });

    if (result.token) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const center =
        (await centerRepository.findBySlug(centerId)) ??
        (await centerRepository.findById(centerId));
      const user = result.userId ? await userRepository.findById(result.userId) : null;

      sendEmailSafe(
        buildForgotPasswordEmail({
          toEmail: email,
          userName: user?.name ?? undefined,
          centerName: center?.name ?? "Cuerpo Raíz",
          resetUrl: `${baseUrl}/auth/reset-password?token=${result.token}`,
        })
      );
    }

    return NextResponse.json(
      { success: true, message: "Si el email existe, recibirás un enlace" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
