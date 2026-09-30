import Link from "next/link";
import { CTAS } from "@/lib/constants/copy";

/** "Tu primera clase": texto configurable (una idea por línea) + CTA a la clase de prueba. */
export function FirstClassSection({ lines, headingId = "first-class-heading" }: { lines: string[]; headingId?: string }) {
  if (lines.length === 0) return null;
  return (
    <section className="px-[var(--space-4)] py-[var(--space-16)] md:px-[var(--space-8)]" aria-labelledby={headingId}>
      <div className="mx-auto grid max-w-6xl gap-[var(--space-6)] rounded-[var(--radius-xl)] bg-[var(--color-tertiary)] p-[var(--space-8)] md:grid-cols-[1fr_1.4fr] md:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">¿Primera vez?</p>
          <h2 id={headingId} className="mt-[var(--space-2)] font-display text-3xl font-semibold text-[var(--color-primary)]">
            Tu primera clase
          </h2>
          <Link
            href="/auth/login?callbackUrl=/panel/reservas%3Ftrial%3D1"
            className="mt-[var(--space-5)] inline-flex rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            {CTAS.clasePrueba}
          </Link>
        </div>
        <ul className="list-disc space-y-[var(--space-2)] pl-[var(--space-5)] text-[var(--color-text)]">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
