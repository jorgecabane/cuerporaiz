"use client";

import { useState, useTransition } from "react";
import { ArchiveRestore, ChevronDown, ChevronUp } from "lucide-react";
import { unarchivePlan } from "./actions";

type ArchivedPlan = {
  id: string;
  name: string;
  slug: string;
  archivedAt: string;
};

export function ArchivedPlansList({ plans }: { plans: ArchivedPlan[] }) {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (plans.length === 0) return null;

  function handleUnarchive(id: string) {
    setPendingId(id);
    startTransition(() => unarchivePlan(id));
  }

  return (
    <section className="mt-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Planes deshabilitados ({plans.length})
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg)]/50 px-4 py-3"
            >
              <div>
                <p className="font-medium text-[var(--color-text)]">{plan.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {plan.slug} · deshabilitado el{" "}
                  {new Date(plan.archivedAt).toLocaleDateString("es-CL")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUnarchive(plan.id)}
                disabled={pendingId === plan.id}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-tertiary)] disabled:opacity-50"
              >
                <ArchiveRestore className="h-4 w-4" aria-hidden />
                {pendingId === plan.id ? "Reactivando…" : "Reactivar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
