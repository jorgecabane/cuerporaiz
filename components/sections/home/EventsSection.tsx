import Image from "next/image";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/AnimateIn";

export type UpcomingEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  location: string | null;
  imageUrl: string | null;
  tag?: string | null;
  priceLabel: string;
};

type EventsSectionProps = {
  title?: string;
  subtitle?: string;
  events: UpcomingEvent[];
  href?: string;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1528319725582-ddc096101511?w=800&q=80";

function formatDay(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("es-CL", { day: "numeric", month: "short", timeZone: "America/Santiago" })
    .replace(".", "");
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
}

export function EventsSection({ title, subtitle, events, href = "/panel/eventos" }: EventsSectionProps) {
  if (events.length === 0) return null;

  return (
    <section
      id="proximos-eventos"
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-24)] md:px-0 md:py-[var(--space-32)]"
      aria-labelledby="events-heading"
    >
      <div className="mx-auto max-w-6xl px-0 md:px-[var(--space-8)]">
        <div className="px-[var(--space-4)] md:px-0">
          <AnimateIn>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
              {subtitle ?? "Próximos eventos"}
            </p>
          </AnimateIn>
          <div className="mt-[var(--space-3)] flex flex-col items-start justify-between gap-[var(--space-4)] md:flex-row md:items-end">
            <AnimateIn delay={0.1}>
              <h2
                id="events-heading"
                className="text-section font-display font-semibold text-[var(--color-primary)]"
              >
                {title ?? "Para vernos en persona"}
              </h2>
            </AnimateIn>
            <AnimateIn delay={0.15}>
              <Link
                href={href}
                className="text-sm font-medium text-[var(--color-primary)] underline underline-offset-4 transition-colors duration-[var(--duration-base)] hover:text-[var(--color-secondary)]"
              >
                Ver todos →
              </Link>
            </AnimateIn>
          </div>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div className="mt-[var(--space-10)]">
        <ul className="mx-auto flex max-w-6xl snap-x snap-mandatory gap-[var(--space-5)] overflow-x-auto px-[var(--space-4)] pb-[var(--space-4)] md:px-[var(--space-8)] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {events.map((ev) => (
            <li key={ev.id} className="flex-shrink-0 snap-start">
              <Link
                href={href}
                className="group flex h-full w-[280px] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-tertiary)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-md)] md:w-[320px]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={ev.imageUrl ?? FALLBACK_IMAGE}
                    alt={ev.title}
                    fill
                    className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.04]"
                    sizes="320px"
                  />
                  {ev.tag && (
                    <div className="absolute left-[var(--space-4)] top-[var(--space-4)]">
                      <span className="rounded-full bg-[var(--color-primary)]/90 px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-white backdrop-blur-sm">
                        {ev.tag}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-[var(--space-5)]">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-secondary)]">
                    {formatDay(ev.startsAt)} · {formatHour(ev.startsAt)}
                  </p>
                  <h3 className="mt-[var(--space-2)] font-display text-xl font-semibold leading-tight text-[var(--color-primary)]">
                    {ev.title}
                  </h3>
                  {ev.description && (
                    <p className="mt-[var(--space-2)] line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {ev.description}
                    </p>
                  )}
                  <div className="mt-[var(--space-5)] flex items-center justify-between gap-[var(--space-3)]">
                    {ev.location && (
                      <span className="truncate text-xs text-[var(--color-text-muted)]">
                        {ev.location}
                      </span>
                    )}
                    <span className="font-display text-sm font-semibold text-[var(--color-primary)]">
                      {ev.priceLabel}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
