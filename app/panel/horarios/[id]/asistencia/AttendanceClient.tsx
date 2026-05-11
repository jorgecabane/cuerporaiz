"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Hourglass } from "lucide-react";
import type { ReservationStatus } from "@/lib/domain";
import type { WaitlistEntryWithUserDto } from "@/lib/dto/waitlist-dto";
import { toast } from "@/components/ui/Toast";
import { AttendanceListSkeleton } from "@/components/ui/PanelSkeletons";

export interface Attendee {
  reservationId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  status: ReservationStatus;
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  ATTENDED: "bg-[var(--color-success-bg,#dcfce7)] text-[var(--color-success,#16a34a)]",
  NO_SHOW: "bg-[var(--color-error-bg,#fef2f2)] text-[var(--color-error,#dc2626)]",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Pendiente",
  ATTENDED: "Asistió",
  NO_SHOW: "No-show",
};

export function AttendanceClient({
  liveClassId,
  initialAttendees,
}: {
  liveClassId: string;
  initialAttendees: Attendee[];
}) {
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntryWithUserDto[]>([]);
  const [waitlistActionId, setWaitlistActionId] = useState<string | null>(null);

  const loadWaitlist = useCallback(async () => {
    const res = await fetch(
      `/api/admin/waitlist?liveClassId=${encodeURIComponent(liveClassId)}`
    );
    if (!res.ok) {
      setWaitlist([]);
      return;
    }
    const data = await res.json();
    setWaitlist(Array.isArray(data.entries) ? data.entries : []);
  }, [liveClassId]);

  useEffect(() => {
    loadWaitlist();
  }, [loadWaitlist]);

  async function reload() {
    setLoading(true);
    try {
      const [resAtt] = await Promise.all([
        fetch(`/api/admin/attendance?liveClassId=${encodeURIComponent(liveClassId)}`),
        loadWaitlist(),
      ]);
      if (resAtt.ok) {
        const data = await resAtt.json();
        setAttendees(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleWaitlistRemove(entryId: string) {
    setWaitlistActionId(entryId);
    try {
      const res = await fetch(`/api/admin/waitlist/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Error al quitar de la lista de espera");
        return;
      }
      toast("Quitado de la lista de espera");
      await loadWaitlist();
    } finally {
      setWaitlistActionId(null);
    }
  }

  async function handleWaitlistPromote(entryId: string) {
    setWaitlistActionId(entryId);
    try {
      const res = await fetch(`/api/admin/waitlist/${entryId}/promote`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "No se pudo promover");
        return;
      }
      toast.success("Estudiante promovido a reserva");
      await reload();
    } finally {
      setWaitlistActionId(null);
    }
  }

  async function markStatus(reservationId: string, status: "ATTENDED" | "NO_SHOW") {
    setUpdating(reservationId);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, status }),
      });
      if (res.ok) {
        toast.success(status === "ATTENDED" ? "Asistencia marcada" : "Inasistencia registrada");
      } else {
        toast.error("Error al marcar asistencia");
      }
      await reload();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-section text-[var(--color-primary)]">
          Asistencia
        </h1>
        <Link
          href={`/panel/horarios/${liveClassId}`}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
        >
          Volver a clase
        </Link>
      </div>

      {loading ? (
        <AttendanceListSkeleton />
      ) : attendees.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 text-center">
          <p className="text-[var(--color-text-muted)]">
            No hay estudiantes reservados para esta clase.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {attendees.map((a) => (
            <li
              key={a.reservationId}
              className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-[var(--color-text)] truncate">
                  {a.userName || a.userEmail}
                </p>
                {a.userName && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{a.userEmail}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[a.status]}`}>
                  {STATUS_LABELS[a.status]}
                </span>

                {updating === a.reservationId ? (
                  <span className="text-xs text-[var(--color-text-muted)]">...</span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => markStatus(a.reservationId, "ATTENDED")}
                      disabled={a.status === "ATTENDED"}
                      className="text-xs px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--color-success,#16a34a)] text-[var(--color-success,#16a34a)] hover:bg-[var(--color-success-bg,#dcfce7)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Asistió
                    </button>
                    <button
                      type="button"
                      onClick={() => markStatus(a.reservationId, "NO_SHOW")}
                      disabled={a.status === "NO_SHOW"}
                      className="text-xs px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--color-error,#dc2626)] text-[var(--color-error,#dc2626)] hover:bg-[var(--color-error-bg,#fef2f2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      No-show
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
          <Hourglass className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
          Lista de espera
          <span className="text-sm font-normal text-[var(--color-text-muted)]">
            ({waitlist.length})
          </span>
        </h2>
        {waitlist.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Nadie está en lista de espera para esta clase.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {waitlist.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">
                    <span className="mr-2 inline-block w-6 text-center text-xs text-[var(--color-text-muted)]">
                      #{e.position}
                    </span>
                    {e.user.name ?? e.user.email}
                  </p>
                  {e.user.name && (
                    <p className="ml-8 text-xs text-[var(--color-text-muted)] truncate">
                      {e.user.email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleWaitlistPromote(e.id)}
                    disabled={waitlistActionId !== null}
                    className="text-xs px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    {waitlistActionId === e.id ? "…" : "Promover"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWaitlistRemove(e.id)}
                    disabled={waitlistActionId !== null}
                    className="text-xs px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/30 disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

