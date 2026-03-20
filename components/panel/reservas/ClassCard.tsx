"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Clock, Users } from "lucide-react";
import type { LiveClassDto } from "@/lib/dto/reservation-dto";
import { Button } from "@/components/ui/Button";

function formatDateAndTime(startsAtIso: string, durationMinutes: number): string {
  const start = new Date(startsAtIso);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const datePart = start.toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timePart = `${start.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} a ${end.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
  return `${datePart} ${timePart}`;
}

function instructorInitial(name: string | null | undefined): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  return name.slice(0, 2).toUpperCase();
}

export interface ClassCardProps {
  class: LiveClassDto & { isTrialClass?: boolean };
  /** Clase ya pasada → estilo más gris */
  isPast?: boolean;
  /** Solo para alumno: ya tiene reserva confirmada en esta clase */
  alreadyReserved?: boolean;
  /** Solo para alumno: id de la reserva confirmada (para cancelar desde el calendario) */
  myReservationId?: string | null;
  /** Solo para alumno: callback al reservar */
  onReserve?: (liveClassId: string) => void;
  /** Solo para alumno: cancelar mi reserva */
  onCancelMyReservation?: (reservationId: string) => void;
  /** Solo para alumno: id de reserva en proceso de cancelación */
  cancelMyReservationLoadingId?: string | null;
  /** Solo para alumno: id de la clase que está cargando (reservando) */
  actionLoadingId?: string | null;
  /** Variante staff: lista de asistentes (reservationId, userName, status) */
  attendees?: Array<{ reservationId: string; userName: string | null; userEmail: string; status: string }>;
  /** Variante staff: callback para marcar asistencia */
  onMarkAttendance?: (reservationId: string, status: "ATTENDED" | "NO_SHOW") => void;
  /** Variante staff: reservationId que está cargando */
  attendanceLoadingId?: string | null;
  /** Admin: desplegable con alumnos, des-reservar y reservar alumno */
  isAdmin?: boolean;
  onCancelReservation?: (reservationId: string) => void;
  cancelReservationLoadingId?: string | null;
  onReserveForStudent?: (liveClassId: string) => void;
  reserveForStudentLoading?: boolean;
  studentsForPicker?: Array<{ id: string; name: string | null; email: string }>;
  /** ID de la clase para la que se muestra el formulario "Reservar estudiante" dentro de la card */
  reserveForClassId?: string | null;
  reserveForUserId?: string;
  setReserveForUserId?: (id: string) => void;
  onReserveForStudentSubmit?: (userId: string, liveClassId: string, userPlanId?: string) => void;
  onCloseReserveForStudent?: () => void;
}

export function ClassCard({
  class: c,
  isPast = false,
  alreadyReserved = false,
  myReservationId = null,
  onReserve,
  onCancelMyReservation,
  cancelMyReservationLoadingId = null,
  actionLoadingId,
  attendees,
  onMarkAttendance,
  attendanceLoadingId,
  isAdmin = false,
  onCancelReservation,
  cancelReservationLoadingId,
  onReserveForStudent,
  reserveForStudentLoading,
  studentsForPicker,
  reserveForClassId,
  reserveForUserId = "",
  setReserveForUserId,
  onReserveForStudentSubmit,
  onCloseReserveForStudent,
}: ClassCardProps) {
  const noSpots = c.spotsLeft <= 0;
  const canReserve = !isPast && !alreadyReserved && !noSpots && onReserve;
  const isStaff = Array.isArray(attendees);
  const tagLabel = c.isOnline ? "Online" : "Presencial";
  const [expanded, setExpanded] = useState(false);
  const attendeeCount = attendees?.length ?? 0;
  const showReserveFormHere = reserveForClassId === c.id;

  return (
    <li
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] ${isPast ? "opacity-75 text-[var(--color-text-muted)]" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Fila 1: tag a la izquierda, fecha y rango horario a la derecha */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                {tagLabel}
              </span>
              {"isTrialClass" in c && c.isTrialClass && (
                <span className="rounded-[var(--radius-md)] bg-[var(--color-primary-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                  Clase de prueba
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">
              {formatDateAndTime(c.startsAt, c.durationMinutes)}
            </span>
          </div>
          {/* Fila 2: título */}
          <p className="mt-2 font-medium text-[var(--color-text)]">{c.title}</p>
          {/* Fila 3: avatar (solo si hay nombre o imagen) + con [nombre profesor] o "Sin profesor asignado" */}
          <div className="mt-1 flex items-center gap-2">
            {c.instructorImageUrl ? (
              <Image
                src={c.instructorImageUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
                width={32}
                height={32}
                unoptimized
              />
            ) : c.instructorName?.trim() ? (
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)]"
                aria-hidden
              >
                {instructorInitial(c.instructorName)}
              </span>
            ) : null}
            <p className="text-sm text-[var(--color-text-muted)]">
              con {c.instructorName?.trim() || "Sin profesor asignado"}
            </p>
          </div>
          {/* Fila 4: duración · máx · cupos */}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {c.durationMinutes} min
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {c.maxCapacity} máx
            </span>
            <span>
              {c.spotsLeft}/{c.maxCapacity} cupos
            </span>
          </p>
          {isStaff && (
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-border)]/30 cursor-pointer"
                  >
                    <span>Estudiantes inscritos ({attendeeCount})</span>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                  {expanded && (
                    <div className="mt-2 space-y-2">
                      {attendees && attendees.length > 0 ? (
                        <ul className="space-y-2">
                          {attendees.map((a) => (
                            <li
                              key={a.reservationId}
                              className="flex flex-wrap items-center justify-between gap-2 text-sm"
                            >
                              <span className="text-[var(--color-text)]">
                                {a.userName || a.userEmail}
                              </span>
                              <span className="flex gap-1 flex-wrap">
                                {onMarkAttendance && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onMarkAttendance(a.reservationId, "ATTENDED")}
                                      disabled={attendanceLoadingId != null}
                                      className="rounded-[var(--radius-md)] border border-[var(--color-primary)] px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 cursor-pointer"
                                    >
                                      Presente
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onMarkAttendance(a.reservationId, "NO_SHOW")}
                                      disabled={attendanceLoadingId != null}
                                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 disabled:opacity-50 cursor-pointer"
                                    >
                                      Ausente
                                    </button>
                                  </>
                                )}
                                {onCancelReservation && (
                                  <button
                                    type="button"
                                    onClick={() => onCancelReservation(a.reservationId)}
                                    disabled={cancelReservationLoadingId != null}
                                    className="rounded-[var(--radius-md)] border border-[var(--color-secondary)] px-2 py-1 text-xs text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/10 disabled:opacity-50 cursor-pointer"
                                  >
                                    {cancelReservationLoadingId === a.reservationId ? "…" : "Des-reservar"}
                                  </button>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[var(--color-text-muted)]">Sin inscritos</p>
                      )}
                      {onReserveForStudent && (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={noSpots || reserveForStudentLoading}
                          onClick={() => onReserveForStudent(c.id)}
                        >
                          {reserveForStudentLoading ? "…" : "Reservar estudiante"}
                        </Button>
                      )}
                    </div>
                  )}
                  {showReserveFormHere && studentsForPicker && setReserveForUserId && onReserveForStudentSubmit && onCloseReserveForStudent && (
                    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 mt-2">
                      <p className="text-sm font-medium text-[var(--color-text)] mb-2">Reservar estudiante para esta clase</p>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] mb-1">Estudiante</label>
                          <select
                            value={reserveForUserId}
                            onChange={(e) => setReserveForUserId(e.target.value)}
                            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                          >
                            <option value="">Elegir estudiante</option>
                            {studentsForPicker.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name || s.email}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onReserveForStudentSubmit(reserveForUserId, c.id)}
                            disabled={!reserveForUserId || reserveForStudentLoading}
                            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer"
                          >
                            {reserveForStudentLoading ? "Reservando…" : "Reservar"}
                          </button>
                          <button
                            type="button"
                            onClick={onCloseReserveForStudent}
                            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-border)]/50 cursor-pointer"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {attendees && attendees.length > 0 ? (
                    <ul className="space-y-2">
                      {attendees.map((a) => (
                        <li
                          key={a.reservationId}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-[var(--color-text)]">
                            {a.userName || a.userEmail}
                          </span>
                          {onMarkAttendance && (
                            <span className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => onMarkAttendance(a.reservationId, "ATTENDED")}
                                disabled={attendanceLoadingId != null}
                                className="rounded-[var(--radius-md)] border border-[var(--color-primary)] px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:opacity-50 cursor-pointer"
                              >
                                Presente
                              </button>
                              <button
                                type="button"
                                onClick={() => onMarkAttendance(a.reservationId, "NO_SHOW")}
                                disabled={attendanceLoadingId != null}
                                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 disabled:opacity-50 cursor-pointer"
                              >
                                Ausente
                              </button>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">Sin inscritos</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {!isStaff && (
          <div className="shrink-0">
            {canReserve && (
              <Button
                type="button"
                variant="primary"
                disabled={actionLoadingId !== null}
                onClick={() => onReserve?.(c.id)}
              >
                {actionLoadingId === c.id ? "Reservando…" : "Reservar"}
              </Button>
            )}
            {alreadyReserved && (
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                <span className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                  Ya reservaste
                </span>
                {!isPast &&
                  myReservationId &&
                  onCancelMyReservation && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={cancelMyReservationLoadingId != null}
                      onClick={() => onCancelMyReservation(myReservationId)}
                    >
                      {cancelMyReservationLoadingId === myReservationId
                        ? "Cancelando…"
                        : "Cancelar reserva"}
                    </Button>
                  )}
              </div>
            )}
            {noSpots && !alreadyReserved && (
              <span className="text-sm text-[var(--color-text-muted)]">Sin cupos</span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
