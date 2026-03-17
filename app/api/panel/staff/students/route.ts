import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/adapters/db";

/**
 * Lista alumnas del centro para selector "Reservar por alumno".
 * Solo admin y profesoras (con permiso de centro).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.centerId) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Debes iniciar sesión" },
        { status: 401 }
      );
    }
    const role = session.user.role;
    if (role !== "ADMINISTRATOR" && role !== "INSTRUCTOR") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Solo profesoras y administradoras" },
        { status: 403 }
      );
    }
    const centerId = session.user.centerId;
    const memberships = await prisma.userCenterRole.findMany({
      where: { centerId, role: "STUDENT" },
      select: { userId: true, user: { select: { name: true, email: true } } },
      orderBy: { user: { email: "asc" } },
    });
    const students = memberships.map((m) => ({
      id: m.userId,
      name: m.user.name ?? null,
      email: m.user.email,
    }));
    return NextResponse.json(students);
  } catch (err) {
    console.error("[panel staff students]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar alumnas" },
      { status: 500 }
    );
  }
}
