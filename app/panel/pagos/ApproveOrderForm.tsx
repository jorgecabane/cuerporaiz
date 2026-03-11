"use client";

import { useTransition } from "react";
import { approveOrderManually } from "./actions";

export function ApproveOrderForm({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        if (
          typeof window !== "undefined" &&
          !window.confirm("¿Marcar esta orden como aprobada (conciliación manual)?")
        )
          return;
        startTransition(() => approveOrderManually(orderId));
      }}
    >
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-md)] bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? "..." : "Aprobar"}
      </button>
    </form>
  );
}
