import type { Metadata } from "next";
import Link from "next/link";
import { centerRepository, prisma } from "@/lib/adapters/db";
import { getPublicCenterTimezone } from "@/lib/datetime/center-timezone";
import { buildSiteMetadata } from "@/lib/seo/metadata";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata({ path: "/eventos", type: "website" });
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1528319725582-ddc096101511?w=800&q=80";

function formatDateTime(date: Date, tz: string): string {
  return date
    .toLocaleDateString("es-CL", {
      timeZone: tz,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(".", "");
}

function priceLabel(amountCents: number): string {
  return amountCents === 0 ? "Gratis" : `$${amountCents.toLocaleString("es-CL")}`;
}

export default async function PublicEventsPage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  const center = slug ? await centerRepository.findBySlug(slug) : null;

  const [events, tz] = await Promise.all([
    center
      ? prisma.event.findMany({
          where: {
            centerId: center.id,
            status: "PUBLISHED",
            startsAt: { gte: new Date() },
          },
          orderBy: { startsAt: "asc" },
        })
      : Promise.resolve([]),
    getPublicCenterTimezone(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-[var(--space-4)] py-[var(--space-20)] md:px-[var(--space-8)] md:py-[var(--space-24)]">
      <header className="mb-[var(--space-10)]">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
          Eventos
        </p>
        <h1 className="mt-[var(--space-3)] font-display text-section font-semibold text-[var(--color-primary)]">
          Para vernos en persona
        </h1>
        <p className="mt-[var(--space-3)] max-w-[60ch] text-[var(--color-text-muted)] leading-relaxed">
          Talleres y encuentros presenciales. Reserva tu entrada en minutos, con o sin cuenta.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-10)] text-center">
          <p className="text-[var(--color-text-muted)]">
            No hay eventos próximos por ahora. ¡Vuelve pronto!
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-[var(--space-6)] sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <li key={ev.id}>
              <Link
                href={`/eventos/${ev.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-md)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-tertiary)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ev.imageUrl ?? FALLBACK_IMAGE}
                    alt={ev.title}
                    className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-[var(--space-5)]">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-secondary)]">
                    {formatDateTime(ev.startsAt, tz)}
                  </p>
                  <h2 className="mt-[var(--space-2)] font-display text-xl font-semibold leading-tight text-[var(--color-primary)]">
                    {ev.title}
                  </h2>
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
                      {priceLabel(ev.amountCents)}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
