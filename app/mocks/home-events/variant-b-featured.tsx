import Image from "next/image";
import Link from "next/link";
import { MOCK_EVENTS } from "./mock-data";

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(".", "");
}

export function VariantBFeatured() {
  const [featured, ...rest] = MOCK_EVENTS;
  const secondary = rest.slice(0, 3);

  return (
    <section
      className="bg-[var(--color-bg)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="mock-events-featured-heading"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
          Próximos eventos
        </p>
        <h2
          id="mock-events-featured-heading"
          className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
        >
          Encuentros que no te puedes perder
        </h2>

        <div className="mt-[var(--space-12)] grid gap-[var(--space-6)] lg:grid-cols-[1.3fr_1fr]">
          {/* Featured event */}
          <article className="group overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-lg)]">
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src={featured.image}
                alt={featured.title}
                fill
                className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
              />
              <div className="absolute left-[var(--space-5)] top-[var(--space-5)] flex gap-[var(--space-2)]">
                <span className="rounded-full bg-[var(--color-secondary)] px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-white">
                  El más próximo
                </span>
                <span className="rounded-full bg-white/90 px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-[var(--color-primary)] backdrop-blur-sm">
                  {featured.tag}
                </span>
              </div>
            </div>
            <div className="p-[var(--space-6)] md:p-[var(--space-8)]">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-secondary)]">
                {formatDateLong(featured.startsAt)}
              </p>
              <h3 className="mt-[var(--space-3)] font-display text-3xl font-semibold leading-tight text-[var(--color-primary)]">
                {featured.title}
              </h3>
              <p className="mt-[var(--space-4)] max-w-xl text-base leading-relaxed text-[var(--color-text-muted)]">
                {featured.description}
              </p>
              <div className="mt-[var(--space-6)] flex flex-wrap items-center gap-[var(--space-5)]">
                <span className="text-sm text-[var(--color-text-muted)]">
                  {featured.location}
                </span>
                <span className="font-display text-lg font-semibold text-[var(--color-primary)]">
                  {featured.price}
                </span>
                <Link
                  href="/panel/eventos"
                  className="ml-auto inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium text-white transition-colors duration-[var(--duration-base)] hover:bg-[var(--color-primary-hover)]"
                >
                  Reservar lugar
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </article>

          {/* Secondary events - vertical stack */}
          <ul className="flex flex-col gap-[var(--space-4)]">
            {secondary.map((ev) => (
              <li key={ev.id}>
                <Link
                  href="/panel/eventos"
                  className="group flex gap-[var(--space-4)] rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-4)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-md)]"
                >
                  <div className="flex flex-shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-tertiary)] px-[var(--space-3)] py-[var(--space-3)] text-center">
                    <span className="font-display text-2xl font-semibold leading-none text-[var(--color-primary)]">
                      {ev.startsAt.getDate()}
                    </span>
                    <span className="mt-[var(--space-1)] text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      {ev.startsAt.toLocaleDateString("es-CL", { month: "short" }).replace(".", "")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-secondary)]">
                      {ev.tag} · {formatDateShort(ev.startsAt)}
                    </p>
                    <h3 className="mt-[var(--space-1)] font-display text-base font-semibold leading-tight text-[var(--color-primary)] transition-colors duration-[var(--duration-base)] group-hover:text-[var(--color-secondary)]">
                      {ev.title}
                    </h3>
                    <p className="mt-[var(--space-1)] line-clamp-2 text-xs text-[var(--color-text-muted)]">
                      {ev.description}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
