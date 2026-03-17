"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReservationStatus } from "@/lib/domain";

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

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance?liveClassId=${encodeURIComponent(liveClassId)}`);
      if (res.ok) {
        const data = await res.json();
        setAttendees(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function markStatus(reservationId: string, status: "ATTENDED" | "NO_SHOW") {
    setUpdating(reservationId);
    try {
      await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, status }),
      });
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
        <p className="text-[var(--color-text-muted)]">Cargando...</p>
      ) : attendees.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 text-center">
          <p className="text-[var(--color-text-muted)]">
            No hay alumnas reservadas para esta clase.
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
    </div>
  );
}

