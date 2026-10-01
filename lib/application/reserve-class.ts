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
import type { LiveClass, Reservation, ReservationStatus } from "@/lib/domain";
import { isUserPlanUsable } from "@/lib/domain/user-plan";
import { canRebookReservation } from "@/lib/domain/reservation";
import {
  centerRepository,
  liveClassRepository,
  reservationRepository,
  userPlanRepository,
  userRepository,
  instructorRepository,
  centerHolidayRepository,
  disciplineRepository,
  siteConfigRepository,
} from "@/lib/adapters/db";
import { splitLines } from "@/lib/domain/embeds";
import { planRepository } from "@/lib/adapters/db";
import { runAfterResponse } from "@/lib/utils/run-after-response";
import { sendEmailSafe } from "@/lib/application/send-email";
import { shouldSendEmail } from "@/lib/application/check-email-preference";
import {
  buildReservationConfirmationEmail,
  buildTrialClassNoticeToTeacherEmail,
} from "@/lib/email/transactional";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";
import { formatMinutesAsShortSpanish } from "@/lib/domain/center-policy";
import { notifyWaitlistOnSpotFreed } from "./notify-waitlist-on-spot-freed";

function toReservationDto(r: Reservation, liveClassDto?: LiveClassDto): ReservationDto {
  return {
    id: r.id,
    userId: r.userId,
    liveClassId: r.liveClassId,
    userPlanId: r.userPlanId,
    isTrial: r.isTrial,
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
  opts?: {
    acceptsTrialReservations?: boolean;
    isOnline?: boolean;
    instructorName?: string | null;
    instructorImageUrl?: string | null;
    disciplineName?: string | null;
    disciplineDescription?: string | null;
  }
): LiveClassDto {
  return {
    id,
    centerId,
    title,
    startsAt: startsAt.toISOString(),
    durationMinutes,
    maxCapacity,
    spotsLeft,
    ...(opts?.acceptsTrialReservations !== undefined ? { acceptsTrialReservations: opts.acceptsTrialReservations } : {}),
    ...(opts?.isOnline !== undefined ? { isOnline: opts.isOnline } : {}),
    ...(opts?.instructorName !== undefined ? { instructorName: opts.instructorName } : {}),
    ...(opts?.instructorImageUrl !== undefined ? { instructorImageUrl: opts.instructorImageUrl } : {}),
    ...(opts?.disciplineName !== undefined ? { disciplineName: opts.disciplineName } : {}),
    ...(opts?.disciplineDescription !== undefined ? { disciplineDescription: opts.disciplineDescription } : {}),
  };
}

/**
 * "Tu primera clase" (config del sitio) para la clase de prueba o la primera
 * reserva del alumno en el centro. Vacío en el resto de las reservas.
 */
async function firstClassTipsFor(userId: string, centerId: string, isTrial: boolean): Promise<string[]> {
  if (!isTrial) {
    const { total } = await reservationRepository.findByUserIdAndCenterPaginated(userId, {
      centerId,
      limit: 1,
      offset: 0,
    });
    if (total > 1) return [];
  }
  const config = await siteConfigRepository.findByCenterId(centerId);
  return splitLines(config?.firstClassInfo);
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

  // Feriado del centro: no se permite reservar en fechas marcadas como feriado
  const classDateUtc = new Date(Date.UTC(
    liveClass.startsAt.getUTCFullYear(),
    liveClass.startsAt.getUTCMonth(),
    liveClass.startsAt.getUTCDate(),
  ));
  const holiday = await centerHolidayRepository.findByCenterIdAndDate(centerId, classDateUtc);
  if (holiday) {
    return {
      success: false,
      code: "HOLIDAY",
      message: "No se puede reservar en feriado",
    };
  }

  // Política: bookBeforeMinutes
  const center = await centerRepository.findById(centerId);
  let isTrialEligible = false;
  if (center) {
    const minutesUntilClass =
      (liveClass.startsAt.getTime() - Date.now()) / (1000 * 60);
    if (minutesUntilClass < center.bookBeforeMinutes) {
      const need = formatMinutesAsShortSpanish(center.bookBeforeMinutes);
      return {
        success: false,
        code: "BOOKING_WINDOW_CLOSED",
        message: `Solo puedes reservar con al menos ${need} de anticipación`,
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
    // Si la clase es de prueba y el usuario aún no la usó, permite reservar sin plan activo.
    // Excepción: clientes marcados como migrados de otra plataforma no tienen derecho a clase de prueba.
    // Si el usuario ya tiene un plan LIVE activo, prefiere usarlo en vez del trial.
    if (liveClass.acceptsTrialReservations && center.allowTrialClassPerPerson) {
      const hasUsableLive = await hasUsableLivePlan(userId, centerId);
      if (!hasUsableLive) {
        const membership = await userRepository.findMembership(userId, centerId);
        if (membership?.isLegacyClient) {
          return {
            success: false,
            code: "TRIAL_NOT_AVAILABLE",
            message: "Esta opción no está disponible para tu cuenta",
          };
        }
        const hasTrial = await reservationRepository.hasTrialReservation(userId, centerId);
        if (hasTrial) {
          return {
            success: false,
            code: "TRIAL_ALREADY_USED",
            message: "Ya utilizaste tu clase de prueba en este centro",
          };
        }
        isTrialEligible = true;
      }
    }
  }

  const confirmed = await liveClassRepository.countConfirmedReservations(liveClassId);
  if (confirmed >= liveClass.maxCapacity) {
    return { success: false, code: "NO_SPOTS", message: "No hay cupos disponibles" };
  }

  // Solo bloquea si la reserva previa sigue vigente. Una fila CANCELLED /
  // LATE_CANCELLED se reactiva más abajo (ver canRebookReservation).
  const existing = await reservationRepository.findByUserAndLiveClass(userId, liveClassId);
  if (existing && !canRebookReservation(existing.status)) {
    const message =
      existing.status === "CONFIRMED"
        ? "Ya tienes una reserva para esta clase"
        : "Ya tienes un registro para esta clase";
    return { success: false, code: "ALREADY_RESERVED", message };
  }

  // Validar plan activo tipo Live (se omite cuando es una clase de prueba elegible).
  let selectedPlan: Awaited<ReturnType<typeof userPlanRepository.findActiveByUserAndCenter>>[number] | null = null;
  if (!isTrialEligible) {
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
    selectedPlan = livePlans[0];
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
  }

  // Reusa la fila cancelada si existe: @@unique([userId, liveClassId]) impide
  // crear una segunda reserva del mismo alumno para la misma clase.
  const reservation = existing
    ? await reservationRepository.reactivate(existing.id, {
        userPlanId: selectedPlan?.id ?? null,
        isTrial: isTrialEligible,
      })
    : await reservationRepository.create({
        userId,
        liveClassId,
        userPlanId: selectedPlan?.id ?? null,
        isTrial: isTrialEligible,
      });

  // Descontar clase del plan (solo si hay plan asignado y tiene límite)
  if (selectedPlan && selectedPlan.classesTotal !== null) {
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
    { acceptsTrialReservations: liveClass.acceptsTrialReservations, isOnline: liveClass.isOnline }
  );

  // Fire-and-forget: emails post-reserva
  const user = await userRepository.findById(userId);
  if (user) {
    const endAt = new Date(liveClass.startsAt.getTime() + liveClass.durationMinutes * 60000);
    const baseUrl = getBaseUrl();
    const branding = await getEmailBranding(centerId);
    // Para clases online: meetingUrl. Para presenciales: dirección del sitio del centro.
    const location = liveClass.isOnline
      ? (liveClass.meetingUrl ?? "Por confirmar")
      : (branding.contactAddress ?? "Presencial");

    // Respeta el switch del perfil. El aviso al profe (trial, abajo) NO se gatea:
    // es a staff, no una preferencia del estudiante.
    if (await shouldSendEmail(userId, centerId, "reservationConfirm")) {
      const firstClassTips = liveClass.isOnline
        ? []
        : await firstClassTipsFor(userId, centerId, reservation.isTrial);
      sendEmailSafe(
        buildReservationConfirmationEmail({
          toEmail: user.email,
          userName: user.name ?? undefined,
          className: liveClass.title,
          startAt: liveClass.startsAt.toISOString(),
          endAt: endAt.toISOString(),
          location,
          myReservationsUrl: `${baseUrl}/panel/reservas`,
          branding,
          isTrial: reservation.isTrial,
          firstClassTips,
        })
      );
    }

    // Aviso al profe/admin solo si ESTA reserva consumió el cupo trial.
    // No depende de si la clase admite trials (puede recibir ambas).
    if (reservation.isTrial) {
      const teacher = liveClass.instructorId
        ? await instructorRepository.findById(liveClass.instructorId, centerId)
        : null;
      const teacherEmail = teacher?.email ?? branding.contactEmail;
      if (teacherEmail) {
        sendEmailSafe(
          buildTrialClassNoticeToTeacherEmail({
            toEmail: teacherEmail,
            teacherName: teacher?.name ?? undefined,
            studentName: user.name ?? user.email,
            studentEmail: user.email,
            className: liveClass.title,
            startAt: liveClass.startsAt.toISOString(),
            endAt: endAt.toISOString(),
            location,
            branding,
          })
        );
      }
    }
  }

  return {
    success: true,
    reservation: toReservationDto(reservation, liveClassDto),
  };
}

/**
 * Cancelar una reserva.
 * Respeta políticas del centro (cancelBeforeMinutes): si se cancela dentro del plazo, se libera cupo.
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

  const cancelBeforeMinutes = center.cancelBeforeMinutes ?? 0;
  const minutesBeforeClass =
    (liveClass.startsAt.getTime() - Date.now()) / (1000 * 60);

  if (minutesBeforeClass < 0) {
    return {
      success: false,
      code: "CLASS_STARTED",
      message: "No se puede cancelar: la clase ya inició",
    };
  }

  let newStatus: "CANCELLED" | "LATE_CANCELLED";
  if (minutesBeforeClass >= cancelBeforeMinutes) {
    newStatus = "CANCELLED";
  } else {
    newStatus = "LATE_CANCELLED";
  }

  const updated = await reservationRepository.updateStatus(reservationId, newStatus);

  if (newStatus === "CANCELLED" && reservation.userPlanId) {
    const userPlan = await userPlanRepository.findById(reservation.userPlanId);
    if (userPlan?.classesTotal !== null) {
      await userPlanRepository.decrementClassesUsed(reservation.userPlanId);
    }
  }

  // LATE_CANCELLED también libera cupo: el cancelador pierde su clase pero el
  // asiento queda disponible para la waitlist.
  if (newStatus === "CANCELLED" || newStatus === "LATE_CANCELLED") {
    // Background: broadcast a la waitlist tras devolver la respuesta al cliente.
    runAfterResponse(
      notifyWaitlistOnSpotFreed("class", reservation.liveClassId).catch((err) =>
        console.error("[waitlist] notify on spot freed failed", err)
      )
    );
  }

  const liveClassDto = toLiveClassDto(
    liveClass.id,
    liveClass.centerId,
    liveClass.title,
    liveClass.startsAt,
    liveClass.durationMinutes,
    liveClass.maxCapacity,
    liveClass.maxCapacity, // no recalculamos spots aquí
    { acceptsTrialReservations: liveClass.acceptsTrialReservations, isOnline: liveClass.isOnline }
  );
  return {
    success: true,
    reservation: toReservationDto(updated, liveClassDto),
  };
}

/**
 * Cancelar una reserva en nombre de un estudiante (solo staff: administración o profesor).
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

  const cancelBeforeMinutes = center.cancelBeforeMinutes ?? 0;
  const minutesBeforeClass =
    (liveClass.startsAt.getTime() - Date.now()) / (1000 * 60);

  if (minutesBeforeClass < 0) {
    return {
      success: false,
      code: "CLASS_STARTED",
      message: "No se puede cancelar: la clase ya inició",
    };
  }

  let newStatus: "CANCELLED" | "LATE_CANCELLED";
  if (minutesBeforeClass >= cancelBeforeMinutes) {
    newStatus = "CANCELLED";
  } else {
    newStatus = "LATE_CANCELLED";
  }

  const updated = await reservationRepository.updateStatus(reservationId, newStatus);

  if (newStatus === "CANCELLED" && reservation.userPlanId) {
    const userPlan = await userPlanRepository.findById(reservation.userPlanId);
    if (userPlan?.classesTotal !== null) {
      await userPlanRepository.decrementClassesUsed(reservation.userPlanId);
    }
  }

  if (newStatus === "CANCELLED" || newStatus === "LATE_CANCELLED") {
    runAfterResponse(
      notifyWaitlistOnSpotFreed("class", reservation.liveClassId).catch((err) =>
        console.error("[waitlist] notify on spot freed (staff) failed", err)
      )
    );
  }

  const liveClassDto = toLiveClassDto(
    liveClass.id,
    liveClass.centerId,
    liveClass.title,
    liveClass.startsAt,
    liveClass.durationMinutes,
    liveClass.maxCapacity,
    liveClass.maxCapacity,
    { acceptsTrialReservations: liveClass.acceptsTrialReservations, isOnline: liveClass.isOnline }
  );
  return {
    success: true,
    reservation: toReservationDto(updated, liveClassDto),
  };
}

/**
 * DTOs de varias clases con consultas en lote: profesores, prácticas y cupos
 * se cargan una sola vez (no una query por clase). Mantiene el orden de `classes`.
 */
async function buildLiveClassDtos(
  centerId: string,
  classes: LiveClass[],
  showTrial = true
): Promise<LiveClassDto[]> {
  if (classes.length === 0) return [];
  const [instructors, disciplines, confirmedById] = await Promise.all([
    instructorRepository.findByCenterId(centerId),
    disciplineRepository.findManyByCenterId(centerId),
    liveClassRepository.countConfirmedByLiveClassIds(classes.map((c) => c.id)),
  ]);
  // LiveClass.instructorId en BD es User.id (userId), no el id del rol
  const instructorByUserId = new Map(instructors.map((i) => [i.userId, i]));
  const disciplineById = new Map(disciplines.map((d) => [d.id, d]));
  return classes.map((c) => {
    const instructor = c.instructorId ? instructorByUserId.get(c.instructorId) : undefined;
    const discipline = c.disciplineId ? disciplineById.get(c.disciplineId) : undefined;
    return toLiveClassDto(
      c.id,
      c.centerId,
      c.title,
      c.startsAt,
      c.durationMinutes,
      c.maxCapacity,
      c.maxCapacity - (confirmedById.get(c.id) ?? 0),
      {
        acceptsTrialReservations: c.acceptsTrialReservations && showTrial,
        isOnline: c.isOnline,
        instructorName: instructor?.name ?? null,
        instructorImageUrl: instructor?.imageUrl ?? null,
        disciplineName: discipline?.name ?? null,
        disciplineDescription: discipline?.description ?? null,
      }
    );
  });
}

/** Reservas → DTOs con su clase (cargadas en lote), ordenadas por fecha de la clase. */
async function buildReservationDtos(centerId: string, reservations: Reservation[]): Promise<ReservationDto[]> {
  const ids = [...new Set(reservations.map((r) => r.liveClassId))];
  const classes = (await liveClassRepository.findByIds(ids)).filter((c) => c.centerId === centerId);
  const dtoById = new Map((await buildLiveClassDtos(centerId, classes)).map((d) => [d.id, d]));
  const dtos: ReservationDto[] = [];
  for (const r of reservations) {
    const liveClassDto = dtoById.get(r.liveClassId);
    if (liveClassDto) dtos.push(toReservationDto(r, liveClassDto));
  }
  return dtos.sort(
    (a, b) =>
      new Date(a.liveClass?.startsAt ?? 0).getTime() - new Date(b.liveClass?.startsAt ?? 0).getTime()
  );
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
  return buildReservationDtos(centerId, reservations);
}

/**
 * Listar clases en vivo del centro (futuras).
 */
export async function listLiveClassesUseCase(centerId: string): Promise<LiveClassDto[]> {
  const classes = await liveClassRepository.findByCenterId(centerId, new Date());
  return buildLiveClassDtos(centerId, classes);
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
 * Si se pasa `viewerUserId`, oculta el flag `acceptsTrialReservations` en las clases
 * cuando ese usuario no debe ver el flujo de prueba (ya tiene plan, es
 * cliente migrado, ya consumió el trial, o el centro lo deshabilitó).
 */
export async function listLiveClassesPaginated(
  centerId: string,
  opts: { page?: number; pageSize?: number; viewerUserId?: string }
): Promise<ListLiveClassesPaginatedResult> {
  const from = new Date();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  const [{ items: classes, total }, showTrialForViewer] = await Promise.all([
    liveClassRepository.findByCenterIdPaginated(centerId, from, { limit: pageSize, offset }),
    opts.viewerUserId ? isUserTrialEligible(opts.viewerUserId, centerId) : Promise.resolve(true),
  ]);
  const items = await buildLiveClassDtos(centerId, classes, showTrialForViewer);
  return { items, total, page, pageSize };
}

/**
 * Listar clases en vivo del centro en un rango de fechas (ej. una semana).
 * Si instructorId se pasa, solo se devuelven las clases de ese profesor.
 * Si `viewerUserId` se pasa, oculta `acceptsTrialReservations` cuando ese usuario no
 * debería ver el flujo de prueba (ver `isUserTrialEligible`).
 */
export async function listLiveClassesByRange(
  centerId: string,
  from: Date,
  to: Date,
  instructorId?: string,
  viewerUserId?: string
): Promise<LiveClassDto[]> {
  const [classes, showTrialForViewer] = await Promise.all([
    liveClassRepository.findByCenterIdAndRange(centerId, from, to, instructorId),
    viewerUserId ? isUserTrialEligible(viewerUserId, centerId) : Promise.resolve(true),
  ]);
  return buildLiveClassDtos(centerId, classes, showTrialForViewer);
}

export interface ListReservationsPaginatedResult {
  items: ReservationDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Listar reservas del usuario en el centro con paginación.
 * Sin statuses = todas (CONFIRMED, CANCELLED, LATE_CANCELLED, ATTENDED, NO_SHOW).
 */
export async function listMyReservationsPaginated(
  userId: string,
  centerId: string,
  opts: { page?: number; pageSize?: number; statuses?: ReservationStatus[] }
): Promise<ListReservationsPaginatedResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  const { items: reservations, total } = await reservationRepository.findByUserIdAndCenterPaginated(
    userId,
    { centerId, limit: pageSize, offset, ...(opts.statuses?.length ? { statuses: opts.statuses } : {}) }
  );
  const items = await buildReservationDtos(centerId, reservations);
  return { items, total, page, pageSize };
}

const DEFAULT_CENTER_PAGE_SIZE = 50;

/**
 * Listar reservas del centro (admin). Misma forma que listMyReservationsPaginated pero por centerId.
 */
export async function listCenterReservationsPaginated(
  centerId: string,
  opts: { page?: number; pageSize?: number; statuses?: ReservationStatus[] }
): Promise<ListReservationsPaginatedResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? DEFAULT_CENTER_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  const { items: reservations, total } = await reservationRepository.findPageByCenterId(centerId, {
    limit: pageSize,
    offset,
    ...(opts.statuses?.length ? { statuses: opts.statuses } : {}),
  });
  const items = await buildReservationDtos(centerId, reservations);
  return { items, total, page, pageSize };
}

/**
 * Indica si se debe mostrar el CTA "Puedes reservar una clase de prueba gratis".
 * Condiciones: centro permite trial, usuario nunca reservó en el centro, y hay al menos
 * una clase futura con acceptsTrialReservations y cupos disponibles.
 */
export async function canShowTrialCta(
  userId: string,
  centerId: string
): Promise<boolean> {
  const center = await centerRepository.findById(centerId);
  if (!center?.allowTrialClassPerPerson) return false;

  // Clientes migrados de otra plataforma no ven el CTA de clase de prueba.
  const membership = await userRepository.findMembership(userId, centerId);
  if (membership?.isLegacyClient) return false;

  const { total: reservationCount } =
    await reservationRepository.findByUserIdAndCenterPaginated(userId, {
      centerId,
      limit: 1,
      offset: 0,
    });
  if (reservationCount > 0) return false;

  const trialClasses = (await liveClassRepository.findByCenterId(centerId, new Date())).filter(
    (c) => c.acceptsTrialReservations
  );
  const confirmedById = await liveClassRepository.countConfirmedByLiveClassIds(trialClasses.map((c) => c.id));
  return trialClasses.some((c) => c.maxCapacity - (confirmedById.get(c.id) ?? 0) > 0);
}

/**
 * Indica si el usuario debe ver el flujo de clase de prueba en este centro.
 * No se ofrece trial si: el centro lo deshabilitó, el cliente está marcado
 * como migrado, ya consumió su trial, o ya tiene un plan LIVE activo (en cuyo
 * caso reserva con su plan, no con trial).
 */
export async function isUserTrialEligible(
  userId: string,
  centerId: string
): Promise<boolean> {
  const center = await centerRepository.findById(centerId);
  if (!center?.allowTrialClassPerPerson) return false;
  const membership = await userRepository.findMembership(userId, centerId);
  if (membership?.isLegacyClient) return false;
  const hasTrial = await reservationRepository.hasTrialReservation(userId, centerId);
  if (hasTrial) return false;
  if (await hasUsableLivePlan(userId, centerId)) return false;
  return true;
}

/**
 * True si el usuario tiene al menos un UserPlan ACTIVE usable de tipo LIVE en
 * el centro. "Usable" según `isUserPlanUsable` (activo, vigente, con cupo).
 */
async function hasUsableLivePlan(userId: string, centerId: string): Promise<boolean> {
  const activePlans = await userPlanRepository.findActiveByUserAndCenter(userId, centerId);
  for (const up of activePlans) {
    if (!isUserPlanUsable(up)) continue;
    const plan = await planRepository.findById(up.planId);
    if (plan?.type === "LIVE") return true;
  }
  return false;
}
