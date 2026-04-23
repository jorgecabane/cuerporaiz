import Image from "next/image";
import { urlForImage } from "@/lib/sanity/image";

type AsanaCardValue = {
  sanskritName: string;
  spanishName: string;
  poseImage?: unknown;
  benefits: string[];
  duration?: string;
  difficulty?: "principiante" | "intermedio" | "avanzado";
};

const DIFFICULTY_LABEL: Record<NonNullable<AsanaCardValue["difficulty"]>, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export function AsanaCard({ value }: { value: AsanaCardValue }) {
  const url = urlForImage(value.poseImage as Parameters<typeof urlForImage>[0]);

  return (
    <article className="not-prose mx-auto my-[var(--space-10)] grid max-w-[80ch] grid-cols-1 overflow-hidden rounded-2xl bg-[var(--color-surface)] shadow-[var(--shadow-sm)] sm:grid-cols-[1fr_1.5fr]">
      <div className="relative aspect-square overflow-hidden">
        {url ? (
          <Image
            src={url}
            alt={value.spanishName ?? value.sanskritName}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-3 p-7 md:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {value.spanishName}
        </p>
        <h3 className="font-display text-3xl italic leading-tight text-[var(--color-primary)]">
          {value.sanskritName}
        </h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {value.difficulty ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-3 py-1 text-[var(--color-primary)]">
              {DIFFICULTY_LABEL[value.difficulty]}
            </span>
          ) : null}
          {value.duration ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--color-secondary)_12%,transparent)] px-3 py-1 text-[var(--color-secondary)]">
              {value.duration}
            </span>
          ) : null}
        </div>
        {value.benefits?.length ? (
          <ul className="mt-1 space-y-1 pl-5 text-[0.9375rem] leading-relaxed marker:text-[var(--color-secondary)]">
            {value.benefits.map((b, i) => (
              <li key={i} className="list-disc">
                {b}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
