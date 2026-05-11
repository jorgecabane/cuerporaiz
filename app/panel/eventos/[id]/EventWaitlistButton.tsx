"use client";

import { useState } from "react";
import { Hourglass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

export interface EventWaitlistButtonProps {
  eventId: string;
  /** Entry activa del usuario en este evento (null = no está en waitlist) */
  waitlistEntryId: string | null;
  waitlistPosition?: number;
}

export function EventWaitlistButton({
  eventId,
  waitlistEntryId,
  waitlistPosition,
}: EventWaitlistButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "event", itemId: eventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "No se pudo unir a la lista");
        return;
      }
      toast.success("Te avisaremos cuando se libere un cupo");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave() {
    if (waitlistEntryId === null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/waitlist/${waitlistEntryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Error al salir de la lista");
        return;
      }
      toast("Saliste de la lista de espera");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (waitlistEntryId !== null) {
    return (
      <div className="flex flex-col items-start gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-light)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)]"
          title="Te avisaremos cuando se libere un cupo"
        >
          <Hourglass className="h-4 w-4" aria-hidden />
          En lista de espera{waitlistPosition !== undefined ? ` · #${waitlistPosition}` : ""}
        </span>
        <button
          type="button"
          onClick={handleLeave}
          disabled={loading}
          className="text-sm text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Saliendo…" : "Salir de la lista"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-[var(--color-text-muted)]">
        Evento agotado. Únete a la lista de espera y te avisaremos si se libera un cupo.
      </p>
      <Button
        type="button"
        variant="secondary"
        disabled={loading}
        onClick={handleJoin}
      >
        <Hourglass className="h-4 w-4" aria-hidden />
        {loading ? "Uniendo…" : "Unirse a lista de espera"}
      </Button>
    </div>
  );
}
