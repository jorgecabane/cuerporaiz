"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { approveOrderManually } from "./actions";

const CONFIRM_MESSAGE =
  "¿Marcar esta orden como aprobada (conciliación manual)?";

export function ApproveOrderForm({ orderId }: { orderId: string }) {
  const submittedRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittedRef.current) {
      submittedRef.current = false;
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(CONFIRM_MESSAGE)
    )
      return;
    submittedRef.current = true;
    (e.target as HTMLFormElement).requestSubmit();
  }

  return (
    <form action={approveOrderManually} onSubmit={handleSubmit}>
      <input type="hidden" name="orderId" value={orderId} readOnly />
      <ApproveSubmitButton />
    </form>
  );
}

function ApproveSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer rounded-[var(--radius-md)] bg-[var(--color-success)] px-2 py-1 text-xs font-medium text-white transition-colors duration-200 hover:bg-[var(--color-success-hover)] disabled:opacity-50"
    >
      {pending ? "..." : "Aprobar"}
    </button>
  );
}
