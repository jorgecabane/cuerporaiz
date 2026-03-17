"use client";

import { useTransition } from "react";
import { toggleGoogleMeet } from "./actions";

type Props = { centerId: string; enabled: boolean };

export function ToggleGoogleMeetForm({ centerId, enabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const newValue = !enabled;

  return (
    <form action={() => startTransition(() => toggleGoogleMeet(centerId, newValue))}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : newValue ? "Activar Google Meet" : "Desactivar Google Meet"}
      </button>
    </form>
  );
}
