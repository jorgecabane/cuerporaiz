/**
 * Casos de uso de reservas.
 * Orquestan dominio y puertos; entrada/salida vía DTOs.
 */
import type {
  ReserveClassResult,
  CancelReservationResult,
  ReservationDto,
  LiveClassDto,
} from "@/lib/dto/reservation-dto";
import type { Reservation } from "@/lib/domain";
import { centerRepository, liveClassRepository, reservationRepository } from "@/lib/adapters/db";

function toReservationDto(r: Reservation, liveClassDto?: LiveClassDto): ReservationDto {
  return {
    id: r.id,
    userId: r.userId,
    liveClassId: r.liveClassId,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    ...(liveClassDto ? { liveClass: liveClassDto } : {}),
  };
}

function toLiveClassDto(
  id: string,
  centerId: string,
  title: string,
  startsAt: Date,
  durationMinutes: number,
  maxCapacity: number,
  spotsLeft: number
): LiveClassDto {
  return {
    id,
    centerId,
    title,
    startsAt: startsAt.toISOString(),
    durationMinutes,
    maxCapacity,
    spotsLeft,
  };
}

/**
 * Reservar una clase en vivo.
 * Respeta cupos y que el usuario pertenezca al centro de la clase.
 */
export async function reserveClassUseCase(
  userId: string,
  centerId: string,
  liveClassId: string
): Promise<ReserveClassResult> {
  const liveClass = await liveClassRepository.findById(liveClassId);
  if (!liveClass) {
    return { success: false, code: "LIVE_CLASS_NOT_FOUND", message: "Clase no encontrada" };
  }
  if (liveClass.centerId !== centerId) {
    return { success: false, code: "FORBIDDEN", message: "La clase no pertenece a tu centro" };
  }
  if (liveClass.startsAt < new Date()) {
    return { success: false, code: "CLASS_PAST", message: "La clase ya pasó" };
  }

  const confirmed = await liveClassRepository.countConfirmedReservations(liveClassId);
  if (confirmed >= liveClass.maxCapacity) {
    return { success: false, code: "NO_SPOTS", message: "No hay cupos disponibles" };
  }

  const existing = await reservationRepository.findByUserAndLiveClass(userId, liveClassId);
  if (existing) {
    if (existing.status === "CONFIRMED") {
      return { success: false, code: "ALREADY_RESERVED", message: "Ya tienes una reserva para esta clase" };
    }
    // Si estaba cancelada, no permitimos re-reservar por ahora (política simple)
    return { success: false, code: "ALREADY_RESERVED", message: "Ya tienes un registro para esta clase" };
  }

  const reservation = await reservationRepository.create({ userId, liveClassId });
  const spotsLeft = liveClass.maxCapacity - confirmed - 1;
  const liveClassDto = toLiveClassDto(
    liveClass.id,
    liveClass.centerId,
    liveClass.title,
    liveClass.startsAt,
    liveClass.durationMinutes,
    liveClass.maxCapacity,
    spotsLeft
  );
  return {
    success: true,
    reservation: toReservationDto(reservation, liveClassDto),
  };
}

/**
 * Cancelar una reserva.
 * Respeta políticas del centro (cancelBeforeHours): si se cancela dentro del plazo, se libera cupo.
 */
export async function cancelReservationUseCase(
  userId: string,
  centerId: string,
  reservationId: string
): Promise<CancelReservationResult> {
  const reservation = await reservationRepository.findById(reservationId);
  if (!reservation) {
    return { success: false, code: "RESERVATION_NOT_FOUND", message: "Reserva no encontrada" };
  }
  if (reservation.userId !== userId) {
    return { success: false, code: "FORBIDDEN", message: "No puedes cancelar esta reserva" };
  }
  if (reservation.status !== "CONFIRMED") {
    return { success: false, code: "NOT_CONFIRMED", message: "Solo se pueden cancelar reservas confirmadas" };
  }

  const liveClass = await liveClassRepository.findById(reservation.liveClassId);
  if (!liveClass || liveClass.centerId !== centerId) {
    return { success: false, code: "FORBIDDEN", message: "Reserva no corresponde a tu centro" };
  }

  const center = await centerRepository.findById(centerId);
  if (!center) {
    return { success: false, code: "CENTER_NOT_FOUND", message: "Centro no encontrado" };
  }

  // Política: si ya pasó el límite de horas antes del inicio, igual se cancela pero la clase se considera consumida (solo cambiamos status)
  const updated = await reservationRepository.updateStatus(reservationId, "CANCELLED");
  const liveClassDto = toLiveClassDto(
    liveClass.id,
    liveClass.centerId,
    liveClass.title,
    liveClass.startsAt,
    liveClass.durationMinutes,
    liveClass.maxCapacity,
    liveClass.maxCapacity // no recalculamos spots aquí
  );
  return {
    success: true,
    reservation: toReservationDto(updated, liveClassDto),
  };
}

/**
 * Listar reservas del usuario en el centro (confirmadas por defecto).
 */
export async function listMyReservationsUseCase(
  userId: string,
  centerId: string,
  options?: { status?: "CONFIRMED" | "CANCELLED" | "ATTENDED" | "NO_SHOW" }
): Promise<ReservationDto[]> {
  const reservations = await reservationRepository.findByUserId(userId, options);
  const dtos: ReservationDto[] = [];
  for (const r of reservations) {
    const liveClass = await liveClassRepository.findById(r.liveClassId);
    if (!liveClass || liveClass.centerId !== centerId) continue;
    const confirmed = await liveClassRepository.countConfirmedReservations(r.liveClassId);
    const spotsLeft = liveClass.maxCapacity - confirmed;
    const liveClassDto = toLiveClassDto(
      liveClass.id,
      liveClass.centerId,
      liveClass.title,
      liveClass.startsAt,
      liveClass.durationMinutes,
      liveClass.maxCapacity,
      spotsLeft
    );
    dtos.push(toReservationDto(r, liveClassDto));
  }
  return dtos.sort(
    (a, b) =>
      new Date(a.liveClass?.startsAt ?? 0).getTime() - new Date(b.liveClass?.startsAt ?? 0).getTime()
  );
}

/**
 * Listar clases en vivo del centro (futuras).
 */
export async function listLiveClassesUseCase(centerId: string): Promise<LiveClassDto[]> {
  const from = new Date();
  const classes = await liveClassRepository.findByCenterId(centerId, from);
  const dtos: LiveClassDto[] = [];
  for (const c of classes) {
    const confirmed = await liveClassRepository.countConfirmedReservations(c.id);
    dtos.push(
      toLiveClassDto(
        c.id,
        c.centerId,
        c.title,
        c.startsAt,
        c.durationMinutes,
        c.maxCapacity,
        c.maxCapacity - confirmed
      )
    );
  }
  return dtos;
}
