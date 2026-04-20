import Image from "next/image";
import Link from "next/link";
import { MOCK_EVENTS } from "./mock-data";

function formatDay(d: Date): string {
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(".", "");
}

function formatHour(d: Date): string {
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export function VariantAScroll() {
  return (
    <section
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-24)] md:px-0 md:py-[var(--space-32)]"
      aria-labelledby="mock-events-scroll-heading"
    >
      <div className="mx-auto max-w-6xl px-0 md:px-[var(--space-8)]">
        <div className="px-[var(--space-4)] md:px-0">
          <div className="flex flex-col items-start justify-between gap-[var(--space-4)] md:flex-row md:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
                Próximos eventos
              </p>
              <h2
                id="mock-events-scroll-heading"
                className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
              >
                Para vernos en persona
              </h2>
            </div>
            <Link
              href="/panel/eventos"
              className="text-sm font-medium text-[var(--color-primary)] underline underline-offset-4 transition-colors duration-[var(--duration-base)] hover:text-[var(--color-secondary)]"
            >
              Ver todos →
            </Link>
          </div>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div className="mt-[var(--space-10)]">
        <ul className="mx-auto flex max-w-6xl snap-x snap-mandatory gap-[var(--space-5)] overflow-x-auto px-[var(--space-4)] pb-[var(--space-4)] md:px-[var(--space-8)] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {MOCK_EVENTS.map((ev) => (
            <li key={ev.id} className="flex-shrink-0 snap-start">
              <article className="group flex w-[280px] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-tertiary)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-md)] md:w-[320px]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={ev.image}
                    alt={ev.title}
                    fill
                    className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.04]"
                    sizes="320px"
                  />
                  <div className="absolute left-[var(--space-4)] top-[var(--space-4)]">
                    <span className="rounded-full bg-[var(--color-primary)]/90 px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-white backdrop-blur-sm">
                      {ev.tag}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-[var(--space-5)]">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-secondary)]">
                    {formatDay(ev.startsAt)} · {formatHour(ev.startsAt)}
                  </p>
                  <h3 className="mt-[var(--space-2)] font-display text-xl font-semibold leading-tight text-[var(--color-primary)]">
                    {ev.title}
                  </h3>
                  <p className="mt-[var(--space-2)] flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {ev.description}
                  </p>
                  <div className="mt-[var(--space-5)] flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {ev.location}
                    </span>
                    <span className="font-display text-sm font-semibold text-[var(--color-primary)]">
                      {ev.price}
                    </span>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
