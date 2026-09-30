"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** PATCH parcial a /api/panel/site-config con estado de guardado. */
export function usePatchSiteConfig() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function save(body: Record<string, unknown>) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await fetch("/api/panel/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar");
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return { save, isPending, error, success };
}
