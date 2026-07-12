/**
 * Caso de uso: listar compañeros con reserva confirmada en una clase, para
 * que un alumno decida si reservar. Requiere que el centro tenga habilitado
 * showClassRosterToStudents. Sin email — a diferencia de ClassAttendanceDto.
 */
import { centerRepository, liveClassRepository, prisma } from "@/lib/adapters/db";
import type { ClassRosterEntryDto } from "@/lib/dto/class-roster-dto";

export type ListClassRosterResult =
  | { success: true; roster: ClassRosterEntryDto[] }
  | { success: false; code: "ROSTER_DISABLED" | "NOT_FOUND"; message: string };

export async function listClassRosterUseCase(
  liveClassId: string,
  centerId: string
): Promise<ListClassRosterResult> {
  const center = await centerRepository.findById(centerId);
  if (!center?.showClassRosterToStudents) {
    return {
      success: false,
      code: "ROSTER_DISABLED",
      message: "El centro no habilitó ver quién más está registrado",
    };
  }

  const liveClass = await liveClassRepository.findById(liveClassId);
  if (!liveClass || liveClass.centerId !== centerId) {
    return { success: false, code: "NOT_FOUND", message: "Clase no encontrada" };
  }

  const reservations = await prisma.reservation.findMany({
    where: { liveClassId, status: "CONFIRMED" },
    include: { user: { select: { id: true, name: true, lastName: true, imageUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  const roster: ClassRosterEntryDto[] = reservations.map((r) => ({
    userId: r.user.id,
    name: r.user.name,
    lastName: r.user.lastName,
    imageUrl: r.user.imageUrl,
  }));

  return { success: true, roster };
}
