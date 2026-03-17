/**
 * Caso de uso: tomar asistencia (marcar ATTENDED / NO_SHOW).
 * Solo profesoras y admins del centro pueden tomar asistencia.
 */
import {
  liveClassRepository,
  reservationRepository,
  userPlanRepository,
  centerRepository,
} from "@/lib/adapters/db";
import type { ReservationStatus } from "@/lib/domain";

export interface MarkAttendanceInput {
  reservationId: string;
  centerId: string;
  status: "ATTENDED" | "NO_SHOW";
}

export interface MarkAttendanceResult {
  success: boolean;
  error?: string;
}

export async function markAttendanceUseCase(
  input: MarkAttendanceInput
): Promise<MarkAttendanceResult> {
  const reservation = await reservationRepository.findById(input.reservationId);
  if (!reservation) {
    return { success: false, error: "Reserva no encontrada" };
  }

  const liveClass = await liveClassRepository.findById(reservation.liveClassId);
  if (!liveClass || liveClass.centerId !== input.centerId) {
    return { success: false, error: "Clase no pertenece a este centro" };
  }

  if (reservation.status !== "CONFIRMED" && reservation.status !== "ATTENDED" && reservation.status !== "NO_SHOW") {
    return { success: false, error: "Solo se puede marcar asistencia de reservas confirmadas" };
  }

  const previousStatus = reservation.status;
  await reservationRepository.updateStatus(input.reservationId, input.status as ReservationStatus);

  // Si pasa de CONFIRMED a NO_SHOW y la política del centro consume clase en no-show,
  // la clase ya fue descontada al reservar, así que no hay que hacer nada extra.
  // Si pasa de NO_SHOW a ATTENDED (corrección), tampoco se modifica el plan.
  // Si pasa de ATTENDED a NO_SHOW (corrección), tampoco se modifica.
  // La clase se descontó al reservar; no-show no devuelve.

  return { success: true };
}

export interface ClassAttendanceDto {
  reservationId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  status: ReservationStatus;
}

/**
 * Listar reservas de una clase para tomar asistencia.
 */
export async function listClassAttendanceUseCase(
  liveClassId: string,
  centerId: string
): Promise<{ success: boolean; attendees?: ClassAttendanceDto[]; error?: string }> {
  const liveClass = await liveClassRepository.findById(liveClassId);
  if (!liveClass || liveClass.centerId !== centerId) {
    return { success: false, error: "Clase no encontrada" };
  }

  const { prisma } = await import("@/lib/adapters/db/prisma");
  const reservations = await prisma.reservation.findMany({
    where: { liveClassId, status: { in: ["CONFIRMED", "ATTENDED", "NO_SHOW"] } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const attendees: ClassAttendanceDto[] = reservations.map((r) => ({
    reservationId: r.id,
    userId: r.user.id,
    userName: r.user.name,
    userEmail: r.user.email,
    status: r.status as ReservationStatus,
  }));

  return { success: true, attendees };
}
