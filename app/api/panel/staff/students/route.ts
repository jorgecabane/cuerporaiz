import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { userRepository } from "@/lib/adapters/db";

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
    const all = await userRepository.findManyByCenterId(centerId);
    const students = all
      .filter((u) => u.role === "STUDENT")
      .map((u) => ({ id: u.id, name: u.name ?? null, email: u.email }));
    return NextResponse.json(students);
  } catch (err) {
    console.error("[panel staff students]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar alumnas" },
      { status: 500 }
    );
  }
}
