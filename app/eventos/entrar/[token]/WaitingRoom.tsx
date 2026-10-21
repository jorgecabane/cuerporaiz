"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventTitle: string;
  attendeeName: string | null;
  startsAtIso: string;
  opensAtIso: string;
  timeZone: string;
};

const REFRESH_FALLBACK_MS = 60_000;
/** Con el reloj del dispositivo adelantado, no pedir al servidor más de una vez cada 5 s. */
const MIN_REFRESH_GAP_MS = 5_000;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d} d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Sala de espera del link personal: cuenta regresiva y refresh al abrir la sala. */
export function WaitingRoom({ eventTitle, attendeeName, startsAtIso, opensAtIso, timeZone }: Props) {
  const router = useRouter();
  const opensAt = new Date(opensAtIso).getTime();
  const [now, setNow] = useState(() => Date.now());
  const lastRefresh = useRef(0);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const fallback = setInterval(() => router.refresh(), REFRESH_FALLBACK_MS);
    return () => {
      clearInterval(tick);
      clearInterval(fallback);
    };
  }, [router]);

  useEffect(() => {
    if (now < opensAt || now - lastRefresh.current < MIN_REFRESH_GAP_MS) return;
    lastRefresh.current = now;
    router.refresh();
  }, [now, opensAt, router]);

  const when = new Date(startsAtIso).toLocaleString("es-CL", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const minutesLeft = Math.ceil(Math.max(0, opensAt - now) / 60_000);

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-[var(--space-4)] py-[var(--space-16)] text-center">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-secondary)]">
        Sala de espera
      </p>
      <h1 className="mt-[var(--space-3)] font-display text-3xl font-semibold text-[var(--color-primary)]">
        {eventTitle}
      </h1>
      <p className="mt-[var(--space-2)] text-[var(--color-text-muted)]">{when}</p>
      {attendeeName && <p className="mt-[var(--space-4)] text-[var(--color-text)]">Hola, {attendeeName}.</p>}
      <p
        className="mt-[var(--space-6)] font-display text-5xl tabular-nums text-[var(--color-primary)]"
        aria-hidden="true"
      >
        {formatCountdown(opensAt - now)}
      </p>
      <p className="sr-only" aria-live="polite">
        La sala se abre en {minutesLeft} {minutesLeft === 1 ? "minuto" : "minutos"}.
      </p>
      <p className="mt-[var(--space-6)] text-[var(--color-text-muted)]">
        Ya casi. La sala se abre 10 minutos antes. Te llevamos a la reunión automáticamente.
      </p>
    </main>
  );
}
