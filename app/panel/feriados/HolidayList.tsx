"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CenterHoliday } from "@/lib/domain";
import { createHoliday, deleteHoliday } from "./actions";
import { formatHolidayDateDisplay, holidayCalendarKey } from "@/lib/domain/holiday-date";

function localTodayKey(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface Props {
  holidays: CenterHoliday[];
}

export function HolidayList({ holidays }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [labelValue, setLabelValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleCreate() {
    if (!dateValue) return;
    setError(null);
    startTransition(async () => {
      const result = await createHoliday(dateValue, labelValue);
      if (!result.ok) {
        setError(result.error ?? "Error desconocido.");
      } else {
        setDateValue("");
        setLabelValue("");
        setShowForm(false);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(() => deleteHoliday(id));
  }

  const todayKey = localTodayKey();
  const upcomingHolidays = holidays.filter((h) => holidayCalendarKey(h.date) >= todayKey);
  const pastHolidays = holidays.filter((h) => holidayCalendarKey(h.date) < todayKey);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">
          {holidays.length} feriado{holidays.length !== 1 ? "s" : ""} registrado{holidays.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          + Agregar feriado
        </button>
      </div>

      {showForm && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="holiday-date" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Fecha
              </label>
              <input
                id="holiday-date"
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              />
            </div>
            <div>
              <label htmlFor="holiday-label" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Nombre (opcional)
              </label>
              <input
                id="holiday-label"
                type="text"
                placeholder="ej. Año Nuevo"
                value={labelValue}
                onChange={(e) => setLabelValue(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)]"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending || !dateValue}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="text-sm text-[var(--color-text-muted)] hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {upcomingHolidays.length > 0 && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Próximos</h2>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {upcomingHolidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {h.label || "Feriado"}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] capitalize">
                    {formatHolidayDateDisplay(h.date)}
                  </p>
                </div>
                <div>
                  {confirmDeleteId === h.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-text-muted)]">¿Eliminar?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(h.id)}
                        disabled={isPending}
                        className="rounded-[var(--radius-md)] bg-[var(--color-error)] px-2 py-1 text-xs text-white hover:bg-[var(--color-error)]/80 disabled:opacity-50"
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-[var(--color-text-muted)] hover:underline"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(h.id)}
                      className="text-xs text-[var(--color-error)] hover:underline"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pastHolidays.length > 0 && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] overflow-hidden opacity-60">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)]">Pasados</h2>
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {pastHolidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {h.label || "Feriado"}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] capitalize">
                    {formatHolidayDateDisplay(h.date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {holidays.length === 0 && !showForm && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-md)]">
          <p className="text-[var(--color-text-muted)]">
            No hay feriados registrados. Agrega uno para bloquear clases ese día.
          </p>
        </div>
      )}
    </div>
  );
}
