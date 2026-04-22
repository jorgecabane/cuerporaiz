"use client";

import { useState, useTransition } from "react";
import { archivePlan, deletePlan, getPlanDependents } from "./actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ModalState =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "confirm-delete" }
  | { kind: "confirm-archive"; dependents: number };

export function DeletePlanForm({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalState>({ kind: "closed" });

  async function handleClickEliminar() {
    setModal({ kind: "loading" });
    try {
      const dependents = await getPlanDependents(planId);
      if (dependents > 0) {
        setModal({ kind: "confirm-archive", dependents });
      } else {
        setModal({ kind: "confirm-delete" });
      }
    } catch {
      setModal({ kind: "confirm-delete" });
    }
  }

  function close() {
    setModal({ kind: "closed" });
  }

  function doDelete() {
    close();
    startTransition(() => deletePlan(planId));
  }

  function doArchive() {
    close();
    startTransition(() => archivePlan(planId));
  }

  const buttonDisabled = isPending || modal.kind === "loading";

  return (
    <>
      <button
        type="button"
        disabled={buttonDisabled}
        onClick={handleClickEliminar}
        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-error)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:bg-[var(--color-error-bg)] disabled:opacity-50"
      >
        {buttonDisabled ? "..." : "Eliminar"}
      </button>

      <ConfirmDialog
        open={modal.kind === "confirm-delete"}
        title={`¿Eliminar "${planName}"?`}
        description="No hay alumnos ni órdenes vinculadas a este plan. Esta acción es permanente."
        confirmLabel="Eliminar plan"
        onConfirm={doDelete}
        onCancel={close}
      />

      <ConfirmDialog
        open={modal.kind === "confirm-archive"}
        variant="warning"
        title={`No se puede eliminar "${planName}"`}
        description={
          modal.kind === "confirm-archive"
            ? `Este plan está vinculado a ${modal.dependents} registro${
                modal.dependents === 1 ? "" : "s"
              } (alumnos, órdenes o suscripciones). Para que nadie más lo compre sin romper a los que ya lo tienen, deshabilítalo.`
            : ""
        }
        confirmLabel="Deshabilitar plan"
        onConfirm={doArchive}
        onCancel={close}
      />
    </>
  );
}
