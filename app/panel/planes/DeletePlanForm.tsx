"use client";

import { useState, useTransition } from "react";
import { deletePlan } from "./actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DeletePlanForm({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleDelete() {
    setShowDeleteConfirm(false);
    startTransition(() => deletePlan(planId));
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setShowDeleteConfirm(true)}
        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-error)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-bg)] disabled:opacity-50"
      >
        {isPending ? "..." : "Eliminar"}
      </button>
      <ConfirmDialog
        open={showDeleteConfirm}
        title={`¿Eliminar "${planName}"?`}
        description="Los usuarios con este plan activo no se verán afectados, pero no se podrán crear nuevas compras."
        confirmLabel="Eliminar plan"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
