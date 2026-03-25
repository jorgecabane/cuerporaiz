import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/adapters/db/prisma";
import { authService } from "@/lib/adapters/auth";
import { changePasswordSchema } from "@/lib/dto/profile-dto";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const valid = await authService.verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
  }

  const newHash = await authService.hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ ok: true });
}
