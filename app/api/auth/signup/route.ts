import { NextResponse } from "next/server";
import { authService } from "@/lib/adapters/auth";
import { userRepository, centerRepository } from "@/lib/adapters/db";
import { signupBodySchema } from "@/lib/dto/auth-dto";
import { isRole, DEFAULT_SIGNUP_ROLE } from "@/lib/domain/role";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildWelcomeStudentEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Datos inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password, name, centerId: centerIdOrSlug, role } = parsed.data;

    const center = await centerRepository.findBySlug(centerIdOrSlug) ?? await centerRepository.findById(centerIdOrSlug);
    if (!center) {
      return NextResponse.json(
        { code: "CENTER_NOT_FOUND", message: "Centro no encontrado" },
        { status: 404 }
      );
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return NextResponse.json(
        { code: "EMAIL_IN_USE", message: "Ya existe una cuenta con ese email" },
        { status: 409 }
      );
    }

    const passwordHash = await authService.hashPassword(password);
    const user = await userRepository.create({ email, passwordHash, name });
    const assignRole = (role && isRole(role)) ? role : DEFAULT_SIGNUP_ROLE;
    await userRepository.addRole(user.id, center.id, assignRole);

    const baseUrl = new URL(request.url).origin;
    sendEmailSafe(buildWelcomeStudentEmail({
      toEmail: email,
      userName: name ?? email.split("@")[0],
      centerName: center.name,
      dashboardUrl: `${baseUrl}/panel`,
      profileUrl: `${baseUrl}/panel/mi-perfil`,
    }));

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
