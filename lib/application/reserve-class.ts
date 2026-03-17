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
import { isUserPlanUsable } from "@/lib/domain/user-plan";
import {
  centerRepository,
  liveClassRepository,
  reservationRepository,
  userPlanRepository,
  userRepository,
  instructorRepository,
} from "@/lib/adapters/db";
import { planRepository } from "@/lib/adapters/db";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildReservationConfirmationEmail } from "@/lib/email/transactional";

function toReservationDto(r: Reservation, liveClassDto?: LiveClassDto): ReservationDto {
  return {
    id: r.id,
    userId: r.userId,
    liveClassId: r.liveClassId,
    userPlanId: r.userPlanId,
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
  spotsLeft: number,
  opts?: { isTrialClass?: boolean; isOnline?: boolean; instructorName?: string | null; instructorImageUrl?: string | null }
): LiveClassDto {
  return {
    id,
    centerId,
    title,
    startsAt: startsAt.toISOString(),
    durationMinutes,
    maxCapacity,
    spotsLeft,
    ...(opts?.isTrialClass !== undefined ? { isTrialClass: opts.isTrialClass } : {}),
    ...(opts?.isOnline !== undefined ? { isOnline: opts.isOnline } : {}),
    ...(opts?.instructorName !== undefined ? { instructorName: opts.instructorName } : {}),
    ...(opts?.instructorImageUrl !== undefined ? { instructorImageUrl: opts.instructorImageUrl } : {}),
  };
}

/**
 * Reservar una clase en vivo.
 * Valida cupos, plan activo del usuario (tipo Live con clases disponibles),
 * y descuenta una clase del plan seleccionado.
 */
export async function reserveClassUseCase(
  userId: string,
  centerId: string,
  liveClassId: string,
  userPlanId?: string
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

  // Política: bookBeforeHours
  const center = await centerRepository.findById(centerId);
  if (center) {
    const hoursUntilClass =
      (liveClass.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilClass < center.bookBeforeHours) {
      return {
        success: false,
        code: "BOOKING_WINDOW_CLOSED",
        message: `Solo puedes reservar con al menos ${center.bookBeforeHours} horas de anticipación`,
      };
    }

    // Política: maxNoShowsPerMonth
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const noShows = await reservationRepository.countByUserAndStatus(
      userId, centerId, "NO_SHOW", startOfMonth
    );
    if (noShows >= center.maxNoShowsPerMonth) {
      return {
        success: false,
        code: "NO_SHOW_LIMIT",
        message: `Alcanzaste el límite de ${center.maxNoShowsPerMonth} inasistencias este mes`,
      };
    }

    // Política: allowTrialClassPerPerson (1 clase de prueba por persona por centro)
    if (liveClass.isTrialClass && center.allowTrialClassPerPerson) {
      const hasTrial = await reservationRepository.hasTrialReservation(userId, centerId);
      if (hasTrial) {
        return {
          success: false,
          code: "TRIAL_ALREADY_USED",
          message: "Ya utilizaste tu clase de prueba en este centro",
        };
      }
    }
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
    return { success: false, code: "ALREADY_RESERVED", message: "Ya tienes un registro para esta clase" };
  }

  // Validar plan activo tipo Live
  const activePlans = await userPlanRepository.findActiveByUserAndCenter(userId, centerId);
  const livePlans = [];
  for (const up of activePlans) {
    if (!isUserPlanUsable(up)) continue;
    const plan = await planRepository.findById(up.planId);
    if (!plan) continue;
    if (plan.type === "LIVE") livePlans.push(up);
  }

  if (livePlans.length === 0) {
    return { success: false, code: "NO_ACTIVE_PLAN", message: "No tienes un plan activo para reservar clases" };
  }

  // Seleccionar plan: si se especificó userPlanId, validar que esté entre los disponibles
  let selectedPlan = livePlans[0];
  if (userPlanId) {
    const match = livePlans.find((p) => p.id === userPlanId);
    if (!match) {
      return { success: false, code: "PLAN_NOT_VALID", message: "El plan seleccionado no es válido para esta reserva" };
    }
    selectedPlan = match;
  } else if (livePlans.length > 1) {
    const planOptions = [];
    for (const up of livePlans) {
      const p = await planRepository.findById(up.planId);
      planOptions.push({
        id: up.id,
        planId: up.planId,
        planName: p?.name,
        classesTotal: up.classesTotal,
        classesUsed: up.classesUsed,
        validUntil: up.validUntil?.toISOString() ?? null,
      });
    }
    return {
      success: false,
      code: "PLAN_SELECTION_REQUIRED",
      message: "Tienes más de un plan activo. Selecciona con cuál quieres reservar.",
      plans: planOptions,
    };
  }

  const reservation = await reservationRepository.create({
    userId,
    liveClassId,
    userPlanId: selectedPlan.id,
  });

  // Descontar clase del plan (solo si tiene límite)
  if (selectedPlan.classesTotal !== null) {
    await userPlanRepository.incrementClassesUsed(selectedPlan.id);
  }

  const spotsLeft = liveClass.maxCapacity - confirmed - 1;
  const liveClassDto = toLiveClassDto(
    liveClass.id,
    liveClass.centerId,
    liveClass.title,
    liveClass.startsAt,
    liveClass.durationMinutes,
    liveClass.maxCapacity,
    spotsLeft,
    { isTrialClass: liveClass.isTrialClass, isOnline: liveClass.isOnline }
  );

  // Fire-and-forget: email de confirmacion
  const user = await userRepository.findById(userId);
  if (user) {
    const endAt = new Date(liveClass.startsAt.getTime() + liveClass.durationMinutes * 60000);
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    sendEmailSafe(
      buildReservationConfirmationEmail({
        toEmail: user.email,
        userName: user.name ?? undefined,
        className: liveClass.title,
        startAt: liveClass.startsAt.toISOString(),
        endAt: endAt.toISOString(),
        location: liveClass.meetingUrl ?? "Presencial",
        myReservationsUrl: `${baseUrl}/panel/reservas`,
      })
    );
  }

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

  const cancelBeforeHours = center.cancelBeforeHours ?? 0;
  const hoursBeforeClass =
    (liveClass.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursBeforeClass < 0) {
    return {
      success: false,
      code: "CLASS_STARTED",
      message: "No se puede cancelar: la clase ya inició",
    };
  }

  let newStatus: "CANCELLED" | "LATE_CANCELLED";
  if (hoursBeforeClass >= cancelBeforeHours) {
    newStatus = "CANCELLED";
  } else {
    newStatus = "LATE_CANCELLED";
  }

  const updated = await reservationRepository.updateStatus(reservationId, newStatus);

  if (newStatus === "CANCELLED" && reservation.userPlanId) {
    await userPlanRepository.decrementClassesUsed(reservation.userPlanId);
  }
  const liveClassDto = toLiveClassDto(
    liveClass.id,
    liveClass.centerId,
    liveClass.title,
    liveClass.startsAt,
    liveClass.durationMinutes,
    liveClass.maxCapacity,
    liveClass.maxCapacity, // no recalculamos spots aquí
    { isTrialClass: liveClass.isTrialClass, isOnline: liveClass.isOnline }
  );
  return {
    success: true,
    reservation: toReservationDto(updated, liveClassDto),
  };
}

/**
 * Cancelar una reserva en nombre de un alumno (solo staff: admin o profesora).
 * Misma lógica de cupo y plan que cancelReservationUseCase.
 */
export async function cancelReservationByStaffUseCase(
  centerId: string,
  reservationId: string
): Promise<CancelReservationResult> {
  const reservation = await reservationRepository.findById(reservationId);
  if (!reservation) {
    return { success: false, code: "RESERVATION_NOT_FOUND", message: "Reserva no encontrada" };
  }

  const liveClass = await liveClassRepository.findById(reservation.liveClassId);
  if (!liveClass || liveClass.centerId !== centerId) {
    return { success: false, code: "FORBIDDEN", message: "Reserva no corresponde a tu centro" };
  }
  if (reservation.status !== "CONFIRMED") {
    return { success: false, code: "NOT_CONFIRMED", message: "Solo se pueden cancelar reservas confirmadas" };
  }

  const center = await centerRepository.findById(centerId);
  if (!center) {
    return { success: false, code: "CENTER_NOT_FOUND", message: "Centro no encontrado" };
  }

  const cancelBeforeHours = center.cancelBeforeHours ?? 0;
  const hoursBeforeClass =
    (liveClass.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursBeforeClass < 0) {
    return {
      success: false,
      code: "CLASS_STARTED",
      message: "No se puede cancelar: la clase ya inició",
    };
  }

  let newStatus: "CANCELLED" | "LATE_CANCELLED";
  if (hoursBeforeClass >= cancelBeforeHours) {
    newStatus = "CANCELLED";
  } else {
    newStatus = "LATE_CANCELLED";
  }

  const updated = await reservationRepository.updateStatus(reservationId, newStatus);

  if (newStatus === "CANCELLED" && reservation.userPlanId) {
    await userPlanRepository.decrementClassesUsed(reservation.userPlanId);
  }
  const liveClassDto = toLiveClassDto(
    liveClass.id,
    liveClass.centerId,
    liveClass.title,
    liveClass.startsAt,
    liveClass.durationMinutes,
    liveClass.maxCapacity,
    liveClass.maxCapacity,
    { isTrialClass: liveClass.isTrialClass, isOnline: liveClass.isOnline }
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
  options?: { status?: "CONFIRMED" | "CANCELLED" | "LATE_CANCELLED" | "ATTENDED" | "NO_SHOW" }
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
      spotsLeft,
      { isTrialClass: liveClass.isTrialClass, isOnline: liveClass.isOnline }
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
  const [classes, instructors] = await Promise.all([
    liveClassRepository.findByCenterId(centerId, from),
    instructorRepository.findByCenterId(centerId),
  ]);
  const nameByUserId = new Map(instructors.map((i) => [i.userId, i.name ?? null]));
  const imageUrlByUserId = new Map(instructors.map((i) => [i.userId, i.imageUrl ?? null]));
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
        c.maxCapacity - confirmed,
        {
          isTrialClass: c.isTrialClass,
          isOnline: c.isOnline,
          instructorName: c.instructorId ? nameByUserId.get(c.instructorId) ?? null : null,
          instructorImageUrl: c.instructorId ? imageUrlByUserId.get(c.instructorId) ?? null : null,
        }
      )
    );
  }
  return dtos;
}

const DEFAULT_PAGE_SIZE = 10;

export interface ListLiveClassesPaginatedResult {
  items: LiveClassDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Listar clases en vivo del centro con paginación.
 */
export async function listLiveClassesPaginated(
  centerId: string,
  opts: { page?: number; pageSize?: number }
): Promise<ListLiveClassesPaginatedResult> {
  const from = new Date();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  const [result, instructors] = await Promise.all([
    liveClassRepository.findByCenterIdPaginated(centerId, from, { limit: pageSize, offset }),
    instructorRepository.findByCenterId(centerId),
  ]);
  const { items: classes, total } = result;
  const nameByUserId = new Map(instructors.map((i) => [i.userId, i.name ?? null]));
  const imageUrlByUserId = new Map(instructors.map((i) => [i.userId, i.imageUrl ?? null]));
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
        c.maxCapacity - confirmed,
        {
          isTrialClass: c.isTrialClass,
          isOnline: c.isOnline,
          instructorName: c.instructorId ? nameByUserId.get(c.instructorId) ?? null : null,
          instructorImageUrl: c.instructorId ? imageUrlByUserId.get(c.instructorId) ?? null : null,
        }
      )
    );
  }
  return { items: dtos, total, page, pageSize };
}

/**
 * Listar clases en vivo del centro en un rango de fechas (ej. una semana).
 * Si instructorId se pasa, solo se devuelven las clases de esa profesora.
 */
export async function listLiveClassesByRange(
  centerId: string,
  from: Date,
  to: Date,
  instructorId?: string
): Promise<LiveClassDto[]> {
  const [classes, instructors] = await Promise.all([
    liveClassRepository.findByCenterIdAndRange(centerId, from, to, instructorId),
    instructorRepository.findByCenterId(centerId),
  ]);
  // LiveClass.instructorId en BD es User.id (userId), no el id del rol
  const nameByUserId = new Map(instructors.map((i) => [i.userId, i.name ?? null]));
  const imageUrlByUserId = new Map(instructors.map((i) => [i.userId, i.imageUrl ?? null]));
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
        c.maxCapacity - confirmed,
        {
          isTrialClass: c.isTrialClass,
          isOnline: c.isOnline,
          instructorName: c.instructorId ? nameByUserId.get(c.instructorId) ?? null : null,
          instructorImageUrl: c.instructorId ? imageUrlByUserId.get(c.instructorId) ?? null : null,
        }
      )
    );
  }
  return dtos;
}

export interface ListReservationsPaginatedResult {
  items: ReservationDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Listar reservas del usuario en el centro con paginación.
 */
export async function listMyReservationsPaginated(
  userId: string,
  centerId: string,
  opts: { page?: number; pageSize?: number }
): Promise<ListReservationsPaginatedResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  const { items: reservations, total } = await reservationRepository.findByUserIdAndCenterPaginated(
    userId,
    { centerId, limit: pageSize, offset }
  );
  const dtos: ReservationDto[] = [];
  for (const r of reservations) {
    const liveClass = await liveClassRepository.findById(r.liveClassId);
    if (!liveClass) continue;
    const confirmed = await liveClassRepository.countConfirmedReservations(r.liveClassId);
    const spotsLeft = liveClass.maxCapacity - confirmed;
    const liveClassDto = toLiveClassDto(
      liveClass.id,
      liveClass.centerId,
      liveClass.title,
      liveClass.startsAt,
      liveClass.durationMinutes,
      liveClass.maxCapacity,
      spotsLeft,
      { isTrialClass: liveClass.isTrialClass, isOnline: liveClass.isOnline }
    );
    dtos.push(toReservationDto(r, liveClassDto));
  }
  const sorted = dtos.sort(
    (a, b) =>
      new Date(a.liveClass?.startsAt ?? 0).getTime() - new Date(b.liveClass?.startsAt ?? 0).getTime()
  );
  return { items: sorted, total, page, pageSize };
}

/**
 * Indica si se debe mostrar el CTA "Podés reservar una clase de prueba gratis".
 * Condiciones: centro permite trial, usuario nunca reservó en el centro, y hay al menos
 * una clase futura con isTrialClass y cupos disponibles.
 */
export async function canShowTrialCta(
  userId: string,
  centerId: string
): Promise<boolean> {
  const center = await centerRepository.findById(centerId);
  if (!center?.allowTrialClassPerPerson) return false;

  const { total: reservationCount } =
    await reservationRepository.findByUserIdAndCenterPaginated(userId, {
      centerId,
      limit: 1,
      offset: 0,
    });
  if (reservationCount > 0) return false;

  const from = new Date();
  const classes = await liveClassRepository.findByCenterId(centerId, from);
  for (const c of classes) {
    if (!c.isTrialClass) continue;
    const confirmed = await liveClassRepository.countConfirmedReservations(c.id);
    if (c.maxCapacity - confirmed > 0) return true;
  }
  return false;
}
