"use client";

import { useEffect, useState, useCallback } from "react";
import { Hourglass } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import type { WaitlistEntryWithUserDto } from "@/lib/dto/waitlist-dto";

export function AdminEventWaitlist({ eventId }: { eventId: string }) {
  const [entries, setEntries] = useState<WaitlistEntryWithUserDto[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/admin/waitlist?eventId=${encodeURIComponent(eventId)}`
    );
    if (!res.ok) {
      setEntries([]);
      return;
    }
    const data = await res.json();
    setEntries(Array.isArray(data.entries) ? data.entries : []);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(entryId: string) {
    setActionId(entryId);
    try {
      const res = await fetch(`/api/admin/waitlist/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Error al quitar de la lista");
        return;
      }
      toast("Quitado de la lista de espera");
      await load();
    } finally {
      setActionId(null);
    }
  }

  async function promote(entryId: string) {
    setActionId(entryId);
    try {
      const res = await fetch(`/api/admin/waitlist/${entryId}/promote`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "No se pudo promover");
        return;
      }
      const msg =
        data.kind === "event"
          ? "Hold creado: el estudiante tiene 15 min para pagar"
          : "Estudiante promovido";
      toast.success(msg);
      await load();
    } finally {
      setActionId(null);
    }
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
        <Hourglass className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
        Lista de espera
        <span className="text-sm font-normal text-[var(--color-text-muted)]">
          ({entries.length})
        </span>
      </h2>
      {entries.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Nadie está en lista de espera para este evento.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
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
                {e.status === "HELD" && e.heldUntil !== null && (
                  <p className="ml-8 mt-1 text-xs text-[var(--color-secondary)]">
                    Hold activo hasta{" "}
                    {new Date(e.heldUntil).toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => promote(e.id)}
                  disabled={actionId !== null || e.status === "HELD"}
                  className="text-xs px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:opacity-30 transition-colors cursor-pointer"
                >
                  {actionId === e.id ? "…" : "Promover"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  disabled={actionId !== null}
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
  );
}
