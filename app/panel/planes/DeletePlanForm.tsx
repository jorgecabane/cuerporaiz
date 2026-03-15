"use client";

import { useTransition } from "react";
import { deletePlan } from "./actions";

export function DeletePlanForm({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        if (typeof window !== "undefined" && !window.confirm(`¿Eliminar el plan "${planName}"?`)) return;
        startTransition(() => deletePlan(planId));
      }}
    >
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-error)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-bg)] disabled:opacity-50"
      >
        {isPending ? "..." : "Eliminar"}
      </button>
    </form>
  );
}
