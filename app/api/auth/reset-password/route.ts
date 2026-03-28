import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/dto/auth-token-dto";
import { resetPassword } from "@/lib/application/reset-password";
import { authTokenRepository } from "@/lib/adapters/db";
import { authService } from "@/lib/adapters/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { token, newPassword } = parsed.data;

    const result = await resetPassword(token, newPassword, {
      tokenRepo: authTokenRepository,
      hashPassword: authService.hashPassword,
    });

    if (!result.success) {
      return NextResponse.json({ code: result.code }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al restablecer la contraseña" },
      { status: 500 }
    );
  }
}
