import type { LiveClassSeries, RepeatFrequency } from "@/lib/domain";
import {
  civilDayKeyInTz,
  civilDayOfMonthInTz,
  civilDayOfWeekInTz,
  civilHourMinuteInTz,
} from "@/lib/datetime/civil-day";
import { generateSeriesInstances } from "./generate-series-instances";

export type SeriesEditScope = "this" | "thisAndFollowing" | "all";

/**
 * Subset de recurrencia del formulario de horarios (mismas claves que
 * `CreateClassFormData`). Lógica pura de edición de series, sin infra.
 */
export interface SeriesScheduleForm {
  startsAt: string; // ISO
  repeat: "none" | "DAILY" | "WEEKLY" | "MONTHLY";
  repeatOnDays: number[]; // 0=Dom..6=Sáb (día civil)
  repeatEveryN: number;
  repeatEnd: "never" | "date" | "count";
  repeatEndDate: string | null;
  repeatEndCount: number | null;
  monthlyMode: "dayOfMonth" | "weekdayOrdinal" | null;
}

/** Campos de programación normalizados para crear/actualizar una serie. */
export interface SeriesScheduleFields {
  repeatFrequency: RepeatFrequency;
  repeatOnDaysOfWeek: number[];
  repeatEveryN: number;
  startsAt: Date;
  endsAt: Date | null;
  repeatCount: number | null;
  monthlyMode: string | null;
}

/**
 * Normaliza el subset de recurrencia del form a los campos de la serie.
 * Resuelve endsAt/repeatCount desde `repeatEnd` (misma lógica que createLiveClass).
 */
/** Fin del día civil (UTC) de una fecha — así "termina el día X" incluye las clases de X. */
function endOfCivilDay(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
}

export function buildSeriesScheduleFields(form: SeriesScheduleForm): SeriesScheduleFields {
  const endsAt =
    form.repeatEnd === "date" && form.repeatEndDate ? endOfCivilDay(form.repeatEndDate) : null;
  const repeatCount =
    form.repeatEnd === "count" && form.repeatEndCount ? form.repeatEndCount : null;

  return {
    repeatFrequency: form.repeat as RepeatFrequency,
    repeatOnDaysOfWeek: form.repeatOnDays,
    repeatEveryN: form.repeatEveryN,
    startsAt: new Date(form.startsAt),
    endsAt,
    repeatCount,
    monthlyMode: form.repeat === "MONTHLY" ? (form.monthlyMode ?? "dayOfMonth") : null,
  };
}

function sameDaySet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

/**
 * ¿Cambió el horario/recurrencia respecto de la serie persistida?
 *
 * Compara el PATRÓN (hora civil de inicio, días de la semana, ancla mensual,
 * frecuencia/intervalo/fin), NO la fecha absoluta del ancla. Así, editar "toda
 * la serie" abriendo cualquier instancia sin tocar el horario se detecta como
 * "sin cambios" (camino barato que preserva reservas), y mover el día/hora o la
 * recurrencia se detecta como cambio (regenera). Si false (y el cupo no baja),
 * el editor usa el camino barato sin regenerar.
 */
export function scheduleChanged(
  series: LiveClassSeries,
  fields: SeriesScheduleFields,
  tz: string,
): boolean {
  if (series.repeatFrequency !== fields.repeatFrequency) return true;
  if (series.repeatEveryN !== fields.repeatEveryN) return true;
  if ((series.repeatCount ?? null) !== (fields.repeatCount ?? null)) return true;
  if ((series.monthlyMode ?? null) !== (fields.monthlyMode ?? null)) return true;

  const endA = series.endsAt ? civilDayKeyInTz(series.endsAt, tz) : null;
  const endB = fields.endsAt ? civilDayKeyInTz(fields.endsAt, tz) : null;
  if (endA !== endB) return true;

  const tA = civilHourMinuteInTz(series.startsAt, tz);
  const tB = civilHourMinuteInTz(fields.startsAt, tz);
  if (tA.hour !== tB.hour || tA.minute !== tB.minute) return true;

  if (fields.repeatFrequency === "WEEKLY") {
    if (!sameDaySet(series.repeatOnDaysOfWeek, fields.repeatOnDaysOfWeek)) return true;
  } else if (fields.repeatFrequency === "MONTHLY") {
    if (fields.monthlyMode === "weekdayOrdinal") {
      if (civilDayOfWeekInTz(series.startsAt, tz) !== civilDayOfWeekInTz(fields.startsAt, tz))
        return true;
      const ordA = Math.ceil(civilDayOfMonthInTz(series.startsAt, tz) / 7);
      const ordB = Math.ceil(civilDayOfMonthInTz(fields.startsAt, tz) / 7);
      if (ordA !== ordB) return true;
    } else if (civilDayOfMonthInTz(series.startsAt, tz) !== civilDayOfMonthInTz(fields.startsAt, tz)) {
      return true;
    }
  }
  return false;
}

/**
 * Al cambiar la fecha de inicio de una serie WEEKLY, DESPLAZA todo el patrón de
 * días por el delta (nuevoDía − díaAnterior), con wrap-around 0..6. Así mover el
 * inicio mueve la serie completa, sin agregar días sueltos:
 * - 1 día `[Lun]` y muevo a Mar (delta +1) ⇒ `[Mar]`.
 * - multi `[Mar,Mié,Jue]` y muevo el martes a lunes (delta −1) ⇒ `[Lun,Mar,Mié]`.
 * Un set vacío se trata como el día de inicio.
 */
export function syncWeeklyDaysOnStartDateChange(
  prevDays: number[],
  prevStartDow: number,
  newStartDow: number,
): number[] {
  if (prevStartDow === newStartDow) return prevDays;

  const delta = newStartDow - prevStartDow;
  const base = prevDays.length > 0 ? prevDays : [prevStartDow];
  const shifted = base.map((d) => ((d + delta) % 7 + 7) % 7);
  return [...new Set(shifted)].sort((a, b) => a - b);
}

/** Conserva sólo las instancias que empiezan en `now` o después. */
export function filterFutureInstances<T extends { startsAt: Date }>(items: T[], now: Date): T[] {
  return items.filter((i) => i.startsAt >= now);
}

export interface TargetClass {
  id: string;
  title: string;
  startsAt: string; // ISO
}

export interface ReservationConflict extends TargetClass {
  confirmed: number;
}

export interface CapacityConflict extends ReservationConflict {
  newCapacity: number;
}

/** Clases con reservas confirmadas (>0), motivo de bloqueo al cambiar horario. */
export function findReservationConflicts(
  classes: TargetClass[],
  confirmedByClassId: Map<string, number>,
): ReservationConflict[] {
  return classes
    .map((c) => ({ ...c, confirmed: confirmedByClassId.get(c.id) ?? 0 }))
    .filter((c) => c.confirmed > 0);
}

/** Clases cuyas reservas confirmadas superan el nuevo cupo, motivo de bloqueo. */
export function findCapacityConflicts(
  classes: TargetClass[],
  newCapacity: number,
  confirmedByClassId: Map<string, number>,
): CapacityConflict[] {
  return classes
    .map((c) => ({ ...c, confirmed: confirmedByClassId.get(c.id) ?? 0, newCapacity }))
    .filter((c) => c.confirmed > newCapacity);
}

const DAY_NAMES = [
  "domingos",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábados",
];

function joinSpanish(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

/** Frase en español del patrón de recurrencia (sin la cláusula de término). */
export function describeRecurrence(fields: SeriesScheduleFields): string {
  const n = fields.repeatEveryN;
  if (fields.repeatFrequency === "DAILY") {
    return n > 1 ? `Cada ${n} días` : "Todos los días";
  }
  if (fields.repeatFrequency === "MONTHLY") {
    return n > 1 ? `Cada ${n} meses` : "Cada mes";
  }
  // WEEKLY
  const every = n > 1 ? `Cada ${n} semanas` : "Cada semana";
  const days = [...fields.repeatOnDaysOfWeek].sort((a, b) => a - b).map((d) => DAY_NAMES[d]);
  if (days.length === 0) return every;
  return `${every} los ${joinSpanish(days)}`;
}

/**
 * Validaciones de borde del form de recurrencia. Devuelve el mensaje de error
 * (en español) o null si es válido.
 */
export function validateSeriesScheduleForm(
  form: SeriesScheduleForm,
  capacity: { maxCapacity: number; trialCapacity: number | null },
): string | null {
  if (form.repeatEveryN < 1) {
    return "El intervalo de repetición debe ser al menos 1.";
  }
  if (form.repeatEnd === "count" && (form.repeatEndCount == null || form.repeatEndCount < 1)) {
    return "La cantidad de repeticiones debe ser al menos 1.";
  }
  if (form.repeatEnd === "date" && form.repeatEndDate) {
    if (new Date(form.repeatEndDate) < new Date(form.startsAt)) {
      return "La fecha de término no puede ser anterior a la fecha de inicio.";
    }
  }
  if (capacity.trialCapacity != null && capacity.trialCapacity > capacity.maxCapacity) {
    return "Los cupos de prueba no pueden superar los cupos totales.";
  }
  return null;
}

// ─── Preview de edición de serie (puro, usado por cliente Y servidor) ──────────

export interface SeriesInstanceInfo {
  id: string;
  title: string;
  startsAt: Date;
  /** Reservas CONFIRMED de esa instancia. */
  confirmed: number;
}

export interface SeriesEditConflict {
  /** Clases futuras con reservas confirmadas (bloquea cambio de horario). */
  reservationClasses: ReservationConflict[];
  /** Clases futuras cuyas reservas confirmadas superan el nuevo cupo. */
  capacityClasses: CapacityConflict[];
}

export interface SeriesEditPreview {
  scheduleChanged: boolean;
  recurrenceSummary: string;
  /** Clases futuras a regenerar (si cambió horario) o a actualizar (si no). */
  affectedCount: number;
  /** Desde cuándo aplica el cambio (ISO). */
  effectiveFrom: string;
  /** Clases anteriores no afectadas. */
  pastPreserved: number;
  /** Clases sueltas (editadas con "solo esta") que NO se verán afectadas. */
  detachedCount: number;
  /** Scope efectivo: "esta y siguientes" sobre la primera instancia ⇒ "all". */
  effectiveScope: SeriesEditScope;
  /** Si la operación regenera (borra+recrea) instancias. */
  willRegenerate: boolean;
  conflict: SeriesEditConflict | null;
}

export interface SeriesEditPreviewInput {
  series: LiveClassSeries;
  fields: SeriesScheduleFields;
  scope: SeriesEditScope;
  openedInstanceId: string;
  openedStartsAt: Date;
  /** Instancias ACTIVAS de la serie con su conteo de reservas confirmadas. */
  instances: SeriesInstanceInfo[];
  newCapacity: number;
  holidayKeys: Set<string>;
  tz: string;
  now: Date;
  detachedCount: number;
}

/**
 * Calcula el impacto y los conflictos de una edición de serie. Puro: no toca DB.
 * Reusado por el diálogo de confirmación (cliente, con datos cargados al render)
 * y por la server action (servidor, como gate autoritativo antes de mutar).
 */
export function buildSeriesEditPreview(input: SeriesEditPreviewInput): SeriesEditPreview {
  const {
    series, fields, instances, openedInstanceId, openedStartsAt,
    newCapacity, holidayKeys, tz, now, detachedCount,
  } = input;

  const changed = scheduleChanged(series, fields, tz);
  const isFirst = instances.length > 0 && instances[0].id === openedInstanceId;
  // "Esta y siguientes" sobre la primera instancia equivale a editar todo.
  const effectiveScope: SeriesEditScope =
    input.scope === "thisAndFollowing" && isFirst ? "all" : input.scope;

  // delFrom: nunca tocamos el pasado. all → desde ahora; thisAndFollowing → desde
  // la instancia abierta (o ahora si está en el pasado).
  const delFrom =
    effectiveScope === "all" ? now : openedStartsAt < now ? now : openedStartsAt;

  const affected = instances.filter((c) => c.startsAt >= delFrom);
  const pastPreserved = instances.filter((c) => c.startsAt < delFrom).length;
  const confirmedMap = new Map(affected.map((c) => [c.id, c.confirmed]));
  const targets: TargetClass[] = affected.map((c) => ({
    id: c.id,
    title: c.title,
    startsAt: c.startsAt.toISOString(),
  }));

  // thisAndFollowing siempre regenera (corta/recrea la serie); all sólo si cambió.
  const willRegenerate = effectiveScope === "thisAndFollowing" || changed;

  const reservationClasses = willRegenerate
    ? findReservationConflicts(targets, confirmedMap)
    : [];
  const capacityClasses = findCapacityConflicts(targets, newCapacity, confirmedMap);
  const conflict: SeriesEditConflict | null =
    reservationClasses.length > 0 || capacityClasses.length > 0
      ? { reservationClasses, capacityClasses }
      : null;

  let affectedCount: number;
  if (willRegenerate) {
    const previewSeries: LiveClassSeries = { ...series, ...fields };
    affectedCount = filterFutureInstances(
      generateSeriesInstances(previewSeries, holidayKeys, tz),
      now,
    ).length;
  } else {
    affectedCount = affected.length;
  }

  return {
    scheduleChanged: changed,
    recurrenceSummary: describeRecurrence(fields),
    affectedCount,
    effectiveFrom: delFrom.toISOString(),
    pastPreserved,
    detachedCount,
    effectiveScope,
    willRegenerate,
    conflict,
  };
}
