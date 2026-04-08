"use client";

import { useTransition } from "react";

type Props = {
  centerId: string;
  enabled: boolean;
  label: string;
  action: (centerId: string, enabled: boolean) => Promise<void>;
};

export function TogglePluginForm({ centerId, enabled, label, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const newValue = !enabled;

  return (
    <form action={() => startTransition(() => action(centerId, newValue))}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : newValue ? `Activar ${label}` : `Desactivar ${label}`}
      </button>
    </form>
  );
}
