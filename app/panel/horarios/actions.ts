"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  liveClassRepository,
  liveClassSeriesRepository,
  centerHolidayRepository,
  reservationRepository,
  userRepository,
} from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";
import { generateSeriesInstances } from "@/lib/application/generate-series-instances";
import {
  buildSeriesScheduleFields,
  buildSeriesEditPreview,
  filterFutureInstances,
  validateSeriesScheduleForm,
  type SeriesEditConflict,
  type SeriesEditScope,
  type SeriesInstanceInfo,
} from "@/lib/application/series-edit";
import { createZoomMeeting } from "@/lib/application/create-zoom-meeting";
import { createGoogleMeetMeeting } from "@/lib/application/create-google-meet-meeting";
import { runAfterResponse } from "@/lib/utils/run-after-response";
import { sendEmailSafe } from "@/lib/application/send-email";
import { closeWaitlistForCancelledClassUseCase } from "@/lib/application/close-waitlist-for-cancelled-class";
import { buildClassCancelledEmail } from "@/lib/email";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";
import type { LiveClass, LiveClassSeries, RepeatFrequency } from "@/lib/domain";
import type { CreateLiveClassInput, UpdateSeriesInput } from "@/lib/ports";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

/** Crea una reunión en Zoom o Google Meet y devuelve la URL. Usado al marcar "Clase online". */
export async function createMeetingForClass(
  provider: "zoom" | "meet",
  params: { title: string; startTime: string; durationMinutes: number }
): Promise<{ joinUrl: string }> {
  const centerId = await requireAdminCenterId();
  const startTime = new Date(params.startTime);

  if (provider === "zoom") {
    const result = await createZoomMeeting(centerId, {
      title: params.title,
      startTime,
      durationMinutes: params.durationMinutes,
    });
    return { joinUrl: result.joinUrl };
  }

  const result = await createGoogleMeetMeeting(centerId, {
    title: params.title,
    startTime,
    durationMinutes: params.durationMinutes,
  });
  return { joinUrl: result.joinUrl };
}

export interface CreateClassFormData {
  title: string;
  disciplineId: string | null;
  instructorId: string | null;
  startsAt: string;
  durationMinutes: number;
  maxCapacity: number;
  isOnline: boolean;
  meetingUrl: string | null;
  acceptsTrialReservations: boolean;
  trialCapacity: number | null;
  color: string | null;
  repeat: "none" | "DAILY" | "WEEKLY" | "MONTHLY";
  repeatOnDays: number[];
  repeatEveryN: number;
  repeatEnd: "never" | "date" | "count";
  repeatEndDate: string | null;
  repeatEndCount: number | null;
  monthlyMode: "dayOfMonth" | "weekdayOrdinal" | null;
}

export async function createLiveClass(data: CreateClassFormData): Promise<void> {
  const centerId = await requireAdminCenterId();

  const startsAt = new Date(data.startsAt);
  if (startsAt <= new Date()) {
    throw new Error("No se pueden agendar clases en el pasado.");
  }

  if (data.repeat === "none") {
    await liveClassRepository.create(centerId, {
      title: data.title,
      startsAt,
      durationMinutes: data.durationMinutes,
      maxCapacity: data.maxCapacity,
      disciplineId: data.disciplineId || null,
      instructorId: data.instructorId || null,
      isOnline: data.isOnline,
      meetingUrl: data.meetingUrl || null,
      acceptsTrialReservations: data.acceptsTrialReservations,
      trialCapacity: data.trialCapacity,
      color: data.color || null,
    });
  } else {
    const endsAt =
      data.repeatEnd === "date" && data.repeatEndDate
        ? new Date(data.repeatEndDate)
        : null;
    const repeatCount =
      data.repeatEnd === "count" && data.repeatEndCount
        ? data.repeatEndCount
        : null;

    const series = await liveClassSeriesRepository.create(centerId, {
      title: data.title,
      disciplineId: data.disciplineId || null,
      instructorId: data.instructorId || null,
      maxCapacity: data.maxCapacity,
      durationMinutes: data.durationMinutes,
      isOnline: data.isOnline,
      meetingUrl: data.meetingUrl || null,
      acceptsTrialReservations: data.acceptsTrialReservations,
      trialCapacity: data.trialCapacity,
      color: data.color || null,
      repeatFrequency: data.repeat as RepeatFrequency,
      repeatOnDaysOfWeek: data.repeatOnDays,
      repeatEveryN: data.repeatEveryN,
      startsAt,
      endsAt,
      repeatCount,
      monthlyMode: data.repeat === "MONTHLY" ? (data.monthlyMode ?? "dayOfMonth") : null,
    });

    const [holidays, tz] = await Promise.all([
      centerHolidayRepository.findByCenterId(centerId),
      getCenterTimezone(centerId),
    ]);
    const holidayDates = new Set(
      holidays.map((h) => h.date.toISOString().slice(0, 10))
    );

    const instances = generateSeriesInstances(series, holidayDates, tz);
    if (instances.length > 0) {
      await liveClassRepository.createMany(centerId, instances);
    }
  }

  redirect("/panel/horarios");
}

export interface UpdateClassFormData {
  id: string;
  title: string;
  disciplineId: string | null;
  instructorId: string | null;
  startsAt: string;
  durationMinutes: number;
  maxCapacity: number;
  isOnline: boolean;
  meetingUrl: string | null;
  acceptsTrialReservations: boolean;
  trialCapacity: number | null;
  color: string | null;
}

export async function updateLiveClass(data: UpdateClassFormData): Promise<void> {
  const centerId = await requireAdminCenterId();

  const existing = await liveClassRepository.findById(data.id);
  if (!existing || existing.centerId !== centerId) {
    throw new Error("Clase no encontrada.");
  }

  const startsAt = new Date(data.startsAt);

  await liveClassRepository.update(data.id, centerId, {
    title: data.title,
    startsAt,
    durationMinutes: data.durationMinutes,
    maxCapacity: data.maxCapacity,
    disciplineId: data.disciplineId || null,
    instructorId: data.instructorId || null,
    isOnline: data.isOnline,
    meetingUrl: data.meetingUrl || null,
    acceptsTrialReservations: data.acceptsTrialReservations,
    trialCapacity: data.trialCapacity,
    color: data.color || null,
  });

  redirect(`/panel/horarios`);
}

export interface BatchCancelResult {
  cancelledCount: number;
  notifiedCount: number;
}

/**
 * Marca varias clases como CANCELLED (soft) y notifica a los alumnos con reserva activa.
 * Solo afecta las clases que pertenecen al centro del admin — las demás se ignoran silenciosamente.
 * Si una clase es instancia de serie, solo se cancela esa instancia, no la serie.
 */
export async function batchCancelLiveClasses(ids: string[]): Promise<BatchCancelResult> {
  const centerId = await requireAdminCenterId();
  if (!Array.isArray(ids) || ids.length === 0) {
    return { cancelledCount: 0, notifiedCount: 0 };
  }

  const [cancelledCount, affectedReservations] = await Promise.all([
    liveClassRepository.updateManyByIds(ids, centerId, { status: "CANCELLED" }),
    reservationRepository.findActiveByLiveClassIds(ids),
  ]);

  if (affectedReservations.length === 0) {
    revalidatePath("/panel/horarios");
    return { cancelledCount, notifiedCount: 0 };
  }

  await reservationRepository.cancelActiveByLiveClassIds(ids);

  const userIds = [...new Set(affectedReservations.map((r) => r.userId))];
  const classIds = [...new Set(affectedReservations.map((r) => r.liveClassId))];
  const [users, classes] = await Promise.all([
    userRepository.findManyByIds(userIds),
    Promise.all(classIds.map((id) => liveClassRepository.findById(id))),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const classMap = new Map(classes.filter((c) => c != null).map((c) => [c!.id, c!]));
  const branding = await getEmailBranding(centerId);
  const tiendaUrl = `${getBaseUrl()}/horarios`;

  const now = new Date();
  let notifiedCount = 0;
  for (const reservation of affectedReservations) {
    const user = userMap.get(reservation.userId);
    const cls = classMap.get(reservation.liveClassId);
    if (!user || !cls) continue;
    if (cls.startsAt < now) continue;
    sendEmailSafe(
      buildClassCancelledEmail({
        toEmail: user.email,
        userName: user.name ?? undefined,
        className: cls.title,
        startAt: cls.startsAt.toISOString(),
        tiendaUrl,
        branding,
      })
    );
    notifiedCount++;
  }

  // Cierra la waitlist de cada clase cancelada y notifica a los en cola.
  // after() ejecuta en background tras devolver la respuesta al admin.
  for (const classId of classIds) {
    runAfterResponse(
      closeWaitlistForCancelledClassUseCase(classId).catch((err) =>
        console.error("[waitlist] close on class cancel failed", err, { classId })
      )
    );
  }

  revalidatePath("/panel/horarios");
  return { cancelledCount, notifiedCount };
}

export type EditScope = SeriesEditScope;

export interface EditSeriesFormData extends UpdateClassFormData {
  scope: EditScope;
  seriesId: string;
  // Recurrencia editable (sólo se usa en scope all/thisAndFollowing).
  repeat: "DAILY" | "WEEKLY" | "MONTHLY";
  repeatOnDays: number[];
  repeatEveryN: number;
  repeatEnd: "never" | "date" | "count";
  repeatEndDate: string | null;
  repeatEndCount: number | null;
  monthlyMode: "dayOfMonth" | "weekdayOrdinal" | null;
}

// El action RETORNA el resultado (no redirige): el cliente navega con router.push
// en éxito. Redirigir acá no navega cuando la operación borra la instancia que se
// está viendo (el redirect del server action no llega al browser en ese caso).
export type UpdateSeriesResult = { ok: true } | { ok: false; conflict: SeriesEditConflict };

/** Genera las instancias FUTURAS (>= now) de una serie. Puro (sin fetch). */
function generateFuture(
  seriesLike: LiveClassSeries,
  holidayKeys: Set<string>,
  tz: string,
  now: Date,
): CreateLiveClassInput[] {
  return filterFutureInstances(generateSeriesInstances(seriesLike, holidayKeys, tz), now);
}

async function loadSeriesEditTarget(data: { id: string; seriesId: string }) {
  const centerId = await requireAdminCenterId();
  const existing = await liveClassRepository.findById(data.id);
  if (!existing || existing.centerId !== centerId) {
    throw new Error("Clase no encontrada.");
  }
  const series = await liveClassSeriesRepository.findById(data.seriesId);
  if (!series || series.centerId !== centerId) {
    throw new Error("Serie no encontrada.");
  }
  return { centerId, existing, series };
}

/**
 * Gate autoritativo (server) de una edición de serie: carga instancias + reservas
 * confirmadas + feriados + TZ y calcula el mismo preview que el cliente
 * (buildSeriesEditPreview). No muta nada. Devuelve también lo necesario para mutar.
 */
async function planSeriesEdit(
  data: EditSeriesFormData,
  ctx: { centerId: string; existing: LiveClass; series: LiveClassSeries },
) {
  const { centerId, existing, series } = ctx;
  const now = new Date();
  const tz = await getCenterTimezone(centerId);
  const fields = buildSeriesScheduleFields(data);

  const [activeInstances, holidays, detachedCount] = await Promise.all([
    liveClassRepository.findBySeriesId(series.id),
    centerHolidayRepository.findByCenterId(centerId),
    liveClassRepository.countDetachedBySeriesFromDate(series.id, centerId, now),
  ]);
  const confirmedMap = await liveClassRepository.countConfirmedByLiveClassIds(
    activeInstances.map((c) => c.id),
  );
  const holidayKeys = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
  const instances: SeriesInstanceInfo[] = activeInstances.map((c) => ({
    id: c.id,
    title: c.title,
    startsAt: c.startsAt,
    confirmed: confirmedMap.get(c.id) ?? 0,
  }));

  const preview = buildSeriesEditPreview({
    series,
    fields,
    scope: data.scope,
    openedInstanceId: existing.id,
    openedStartsAt: existing.startsAt,
    instances,
    newCapacity: data.maxCapacity,
    holidayKeys,
    tz,
    now,
    detachedCount,
  });

  return { centerId, series, fields, now, tz, holidayKeys, preview };
}

/**
 * Mutación de edición de serie (UNA sola server action en el flujo — el preview
 * es client-side). Redirige en éxito (navegación nativa al invocarla con
 * `startTransition(async () => await updateSeriesClasses(...))`) y retorna el
 * conflicto en caso de carrera (reserva creada entre el preview y el guardado).
 */
export async function updateSeriesClasses(
  data: EditSeriesFormData,
): Promise<UpdateSeriesResult> {
  const ctx = await loadSeriesEditTarget(data);
  const { centerId, series } = ctx;

  const classUpdate = {
    title: data.title,
    durationMinutes: data.durationMinutes,
    maxCapacity: data.maxCapacity,
    disciplineId: data.disciplineId || null,
    instructorId: data.instructorId || null,
    isOnline: data.isOnline,
    meetingUrl: data.meetingUrl || null,
    acceptsTrialReservations: data.acceptsTrialReservations,
    trialCapacity: data.trialCapacity,
    color: data.color || null,
  };

  // Scope "this": desvincula y mueve sólo esta instancia (conserva el origen
  // para poder avisar luego al editar la serie).
  if (data.scope === "this") {
    await liveClassRepository.update(data.id, centerId, {
      ...classUpdate,
      startsAt: new Date(data.startsAt),
      seriesId: null,
      detachedFromSeriesId: series.id,
    });
    return { ok: true };
  }

  // Validación de borde de la recurrencia.
  const validationError = validateSeriesScheduleForm(data, {
    maxCapacity: data.maxCapacity,
    trialCapacity: data.trialCapacity,
  });
  if (validationError) throw new Error(validationError);

  const { fields, now, tz, holidayKeys, preview } = await planSeriesEdit(data, ctx);
  if (preview.conflict) {
    return { ok: false, conflict: preview.conflict };
  }

  const seriesUpdate: UpdateSeriesInput = { ...classUpdate };
  const delFrom = new Date(preview.effectiveFrom);

  if (preview.effectiveScope === "all" && !preview.willRegenerate) {
    // Sólo propiedades: actualiza serie + instancias activas, preserva reservas.
    await liveClassSeriesRepository.update(series.id, centerId, seriesUpdate);
    await liveClassRepository.updateManyBySeriesId(series.id, centerId, classUpdate);
    return { ok: true };
  }

  if (preview.effectiveScope === "all") {
    // Cambió horario/recurrencia: actualiza la serie y regenera sólo futuras.
    const updated = await liveClassSeriesRepository.update(series.id, centerId, {
      ...seriesUpdate,
      startsAt: fields.startsAt,
      endsAt: fields.endsAt,
      repeatFrequency: fields.repeatFrequency,
      repeatOnDaysOfWeek: fields.repeatOnDaysOfWeek,
      repeatEveryN: fields.repeatEveryN,
      repeatCount: fields.repeatCount,
      monthlyMode: fields.monthlyMode,
    });
    await liveClassRepository.deleteBySeriesIdFromDate(series.id, centerId, now);
    const future = generateFuture(updated ?? series, holidayKeys, tz, now);
    if (future.length > 0) await liveClassRepository.createMany(centerId, future);
    return { ok: true };
  }

  // thisAndFollowing: corta la serie vieja en delFrom y crea una serie nueva
  // con la recurrencia del form; regenera sólo futuras.
  await liveClassSeriesRepository.update(series.id, centerId, { endsAt: delFrom });
  await liveClassRepository.deleteBySeriesIdFromDate(series.id, centerId, delFrom);
  const newSeries = await liveClassSeriesRepository.create(centerId, {
    ...seriesUpdate,
    title: data.title,
    maxCapacity: data.maxCapacity,
    durationMinutes: data.durationMinutes,
    repeatFrequency: fields.repeatFrequency,
    repeatOnDaysOfWeek: fields.repeatOnDaysOfWeek,
    repeatEveryN: fields.repeatEveryN,
    startsAt: fields.startsAt,
    endsAt: fields.endsAt,
    repeatCount: fields.repeatCount,
    monthlyMode: fields.monthlyMode,
  });
  const future = generateFuture(newSeries, holidayKeys, tz, now);
  if (future.length > 0) await liveClassRepository.createMany(centerId, future);
  return { ok: true };
}

export interface CancelScopePreview {
  classCount: number;
  willEmailCount: number;
}

async function resolveTargetClasses(
  existing: LiveClass,
  scope: EditScope,
  centerId: string,
): Promise<LiveClass[]> {
  if (scope === "this" || !existing.seriesId) return [existing];
  const all = await liveClassRepository.findBySeriesId(existing.seriesId);
  const sameCenter = all.filter((c) => c.centerId === centerId);
  if (scope === "all") return sameCenter;
  return sameCenter.filter((c) => c.startsAt >= existing.startsAt);
}

export async function previewCancelScope(
  liveClassId: string,
  scope: EditScope,
): Promise<CancelScopePreview> {
  const centerId = await requireAdminCenterId();
  const existing = await liveClassRepository.findById(liveClassId);
  if (!existing || existing.centerId !== centerId) {
    throw new Error("Clase no encontrada.");
  }

  const targets = await resolveTargetClasses(existing, scope, centerId);
  if (targets.length === 0) return { classCount: 0, willEmailCount: 0 };

  const now = new Date();
  const futureClassIds = new Set(
    targets.filter((c) => c.startsAt >= now).map((c) => c.id),
  );

  if (futureClassIds.size === 0) {
    return { classCount: targets.length, willEmailCount: 0 };
  }

  const reservations = await reservationRepository.findActiveByLiveClassIds(
    [...futureClassIds],
  );
  const willEmailUsers = new Set(reservations.map((r) => r.userId));
  return { classCount: targets.length, willEmailCount: willEmailUsers.size };
}

export async function cancelLiveClassWithScope(
  liveClassId: string,
  scope: EditScope,
): Promise<void> {
  const centerId = await requireAdminCenterId();
  const existing = await liveClassRepository.findById(liveClassId);
  if (!existing || existing.centerId !== centerId) {
    throw new Error("Clase no encontrada.");
  }

  const targets = await resolveTargetClasses(existing, scope, centerId);
  const ids = targets.map((c) => c.id);
  if (ids.length > 0) await batchCancelLiveClasses(ids);
  // No redirige: el cliente navega con window.location (el redirect del server
  // action no llega al browser de forma confiable junto con el diálogo/preview).
}

export async function deleteLiveClass(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  if (!id) return;
  await liveClassRepository.delete(id, centerId);
  redirect("/panel/horarios");
}
