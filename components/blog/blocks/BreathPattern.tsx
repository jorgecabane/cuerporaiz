"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Phase = {
  label: "inhale" | "hold-in" | "exhale" | "hold-out";
  seconds: number;
};

type BreathPatternValue = {
  name: string;
  phases: Phase[];
  rounds: number;
  description?: string;
};

const PHASE_LABELS: Record<Phase["label"], string> = {
  inhale: "Inhala",
  "hold-in": "Sostén (lleno)",
  exhale: "Exhala",
  "hold-out": "Sostén (vacío)",
};

export function BreathPattern({ value }: { value: BreathPatternValue }) {
  const phases = useMemo(() => value.phases ?? [], [value.phases]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(phases[0]?.seconds ?? 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = useMemo(
    () => phases.reduce((acc, p) => acc + (p?.seconds ?? 0), 0),
    [phases],
  );

  const phaseDuration = phases[phaseIndex]?.seconds ?? 0;
  const phaseLabel = PHASE_LABELS[phases[phaseIndex]?.label ?? "inhale"];

  useEffect(() => {
    if (!isPlaying || phases.length === 0) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        setPhaseIndex((idx) => {
          const nextIdx = idx + 1;
          if (nextIdx >= phases.length) {
            setCurrentRound((r) => {
              if (r >= value.rounds) {
                setIsPlaying(false);
                return 1;
              }
              return r + 1;
            });
            return 0;
          }
          return nextIdx;
        });
        const nextPhaseIdx = (phaseIndex + 1) % phases.length;
        return phases[nextPhaseIdx]?.seconds ?? 0;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, phaseIndex, phases, value.rounds]);

  function toggle() {
    if (isPlaying) {
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setPhaseIndex(0);
    setCurrentRound(1);
    setSecondsLeft(phases[0]?.seconds ?? 0);
    setIsPlaying(true);
  }

  const scale = (() => {
    const p = phases[phaseIndex];
    if (!p) return 0.7;
    if (p.label === "inhale") return 1;
    if (p.label === "exhale") return 0.6;
    return p.label === "hold-in" ? 1 : 0.6;
  })();

  return (
    <section className="not-prose mx-auto my-[var(--space-10)] max-w-[65ch] rounded-2xl bg-[var(--color-surface)] p-[var(--space-8)] text-center shadow-[var(--shadow-sm)]">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        Pranayama
      </p>
      <h3 className="mt-1 font-display text-2xl text-[var(--color-primary)]">{value.name}</h3>

      <div
        className="mx-auto my-[var(--space-5)] h-40 w-40 rounded-full bg-[var(--color-primary)] transition-[transform,opacity]"
        style={{
          transform: `scale(${isPlaying ? scale : 0.7})`,
          opacity: isPlaying ? 0.9 : 0.7,
          transitionDuration: isPlaying ? `${phaseDuration}s` : "300ms",
          transitionTimingFunction: "cubic-bezier(0.45, 0, 0.55, 1)",
        }}
        aria-hidden="true"
      />

      <p className="font-display text-lg italic text-[var(--color-text-muted)]">
        {isPlaying ? `${phaseLabel} · ${secondsLeft}s` : "Inhala · Sostén · Exhala"}
      </p>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        {isPlaying
          ? `Ciclo ${currentRound} de ${value.rounds}`
          : `${value.rounds} ciclos · ~${Math.round((totalSeconds * value.rounds) / 60)} min`}
      </p>

      {value.description ? (
        <p className="mx-auto mt-[var(--space-4)] max-w-prose text-sm leading-relaxed text-[var(--color-text)]">
          {value.description}
        </p>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        className="mt-[var(--space-6)] rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] active:scale-[0.97]"
      >
        {isPlaying ? "Detener" : "Iniciar práctica"}
      </button>
    </section>
  );
}
