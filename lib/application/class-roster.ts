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
  const result = await listClassRostersUseCase([liveClassId], centerId);
  if (!result.success) return result;
  const roster = result.rosters[liveClassId];
  if (!roster) return { success: false, code: "NOT_FOUND", message: "Clase no encontrada" };
  return { success: true, roster };
}

export type ListClassRostersResult =
  | { success: true; rosters: Record<string, ClassRosterEntryDto[]> }
  | { success: false; code: "ROSTER_DISABLED"; message: string };

/**
 * Compañeros de varias clases en una sola consulta (calendario del alumno:
 * antes era una llamada por clase). Ignora clases de otro centro.
 */
export async function listClassRostersUseCase(
  liveClassIds: string[],
  centerId: string
): Promise<ListClassRostersResult> {
  const center = await centerRepository.findById(centerId);
  if (!center?.showClassRosterToStudents) {
    return {
      success: false,
      code: "ROSTER_DISABLED",
      message: "El centro no habilitó ver quién más está registrado",
    };
  }

  const classes = liveClassIds.length ? await liveClassRepository.findByIds(liveClassIds) : [];
  const allowed = classes.filter((c) => c.centerId === centerId).map((c) => c.id);
  const rosters: Record<string, ClassRosterEntryDto[]> = Object.fromEntries(allowed.map((id) => [id, []]));
  if (allowed.length === 0) return { success: true, rosters };

  const reservations = await prisma.reservation.findMany({
    where: { liveClassId: { in: allowed }, status: "CONFIRMED" },
    include: { user: { select: { id: true, name: true, lastName: true, imageUrl: true } } },
    orderBy: { createdAt: "asc" },
  });
  for (const r of reservations) {
    rosters[r.liveClassId].push({ userId: r.user.id, name: r.user.name, lastName: r.user.lastName, imageUrl: r.user.imageUrl });
  }
  return { success: true, rosters };
}
