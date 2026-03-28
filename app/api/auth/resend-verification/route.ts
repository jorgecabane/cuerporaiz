import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/application/check-rate-limit";
import { requestEmailVerification } from "@/lib/application/request-email-verification";
import { authTokenRepository, loginAttemptRepository, centerRepository, prisma } from "@/lib/adapters/db";
import { buildEmailVerificationEmail } from "@/lib/email/auth";
import { sendEmailSafe } from "@/lib/application/send-email";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: userId, email, centerId } = session.user;

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
      return NextResponse.json({ code: "ALREADY_VERIFIED" }, { status: 400 });
    }

    const token = await requestEmailVerification(userId, authTokenRepository);

    const center =
      (await centerRepository.findBySlug(centerId)) ??
      (await centerRepository.findById(centerId));
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    sendEmailSafe(
      buildEmailVerificationEmail({
        toEmail: email,
        centerName: center?.name ?? "Cuerpo Raíz",
        verifyUrl: `${baseUrl}/auth/verify-email?token=${token}`,
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
