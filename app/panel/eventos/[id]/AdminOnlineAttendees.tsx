"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { revokeEventAttendee } from "@/app/panel/eventos/actions";

export type OnlineAttendeeRow = {
  id: string;
  seat: number;
  buyer: string;
  attendee: string | null;
  enteredAt: string | null;
  revoked: boolean;
};

function statusLabel(r: OnlineAttendeeRow): string {
  if (r.revoked) return "Revocado";
  return r.enteredAt ? `Entró a las ${r.enteredAt}` : "No ha entrado";
}

/** Asistentes de un evento online: quién entró y revocar links. */
export function AdminOnlineAttendees({ eventId, rows }: { eventId: string; rows: OnlineAttendeeRow[] }) {
  const [target, setTarget] = useState<OnlineAttendeeRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    if (!target) return;
    const id = target.id;
    setTarget(null);
    startTransition(() => revokeEventAttendee(id, eventId));
  }

  return (
    <section className="mb-8">
      <ConfirmDialog
        open={!!target}
        onConfirm={confirm}
        onCancel={() => setTarget(null)}
        title="¿Revocar este link?"
        description="La persona ya no podrá entrar con este link. No se puede deshacer."
        confirmLabel="Revocar link"
        loading={isPending}
      />
      <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Asistentes online</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Aún no hay entradas confirmadas.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {r.attendee ?? `Entrada ${r.seat} de ${r.buyer}`}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Compró {r.buyer} · Entrada {r.seat}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-muted)]">{statusLabel(r)}</span>
                {!r.revoked && (
                  <button
                    type="button"
                    onClick={() => setTarget(r)}
                    className="min-h-[44px] text-sm font-medium text-[var(--color-error)] underline underline-offset-2"
                  >
                    Revocar link
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
