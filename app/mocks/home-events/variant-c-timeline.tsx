import Image from "next/image";
import Link from "next/link";
import { MOCK_EVENTS } from "./mock-data";

function monthLabel(d: Date): string {
  return d.toLocaleDateString("es-CL", { month: "long" });
}

export function VariantCTimeline() {
  return (
    <section
      className="bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="mock-events-timeline-heading"
    >
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
          Próximos eventos
        </p>
        <h2
          id="mock-events-timeline-heading"
          className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
        >
          Agenda de encuentros
        </h2>
        <p className="mt-[var(--space-4)] max-w-xl text-base leading-relaxed text-[var(--color-text-muted)]">
          Talleres, círculos y retiros en los próximos dos meses.
        </p>

        <ol className="relative mt-[var(--space-12)] border-l-2 border-[var(--color-border)] pl-[var(--space-8)] md:pl-[var(--space-10)]">
          {MOCK_EVENTS.map((ev, i) => (
            <li key={ev.id} className={i < MOCK_EVENTS.length - 1 ? "pb-[var(--space-10)]" : ""}>
              {/* Date marker */}
              <div className="absolute -left-[17px] flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-[11px] font-medium text-white shadow-[var(--shadow-sm)]">
                {ev.startsAt.getDate()}
              </div>

              <Link href="/panel/eventos" className="group block">
                <div className="flex flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-5)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-md)] md:flex-row md:items-center md:p-[var(--space-6)]">
                  <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-[var(--radius-md)] md:h-24 md:w-32">
                    <Image
                      src={ev.image}
                      alt={ev.title}
                      fill
                      className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.05]"
                      sizes="(max-width: 768px) 100vw, 128px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-secondary)]">
                        {monthLabel(ev.startsAt)} ·{" "}
                        {ev.startsAt.toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="rounded-full bg-[var(--color-tertiary)] px-[var(--space-2)] py-[2px] text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                        {ev.tag}
                      </span>
                    </div>
                    <h3 className="mt-[var(--space-2)] font-display text-xl font-semibold leading-tight text-[var(--color-primary)] transition-colors duration-[var(--duration-base)] group-hover:text-[var(--color-secondary)]">
                      {ev.title}
                    </h3>
                    <p className="mt-[var(--space-2)] text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {ev.description}
                    </p>
                    <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-4)]">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {ev.location}
                      </span>
                      <span className="font-display text-sm font-semibold text-[var(--color-primary)]">
                        {ev.price}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-[var(--space-10)] flex justify-center">
          <Link
            href="/panel/eventos"
            className="inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-3)] text-sm font-medium text-white transition-colors duration-[var(--duration-base)] hover:bg-[var(--color-primary-hover)]"
          >
            Ver todos los eventos
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
