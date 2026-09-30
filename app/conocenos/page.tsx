import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { centerRepository, siteConfigRepository, aboutPageRepository } from "@/lib/adapters/db";
import { buildSiteMetadata } from "@/lib/seo/metadata";
import { FirstClassSection } from "@/components/sections/horarios/FirstClassSection";
import { googleMapsEmbedUrl, googleMapsLink, splitLines, videoEmbedUrl } from "@/lib/domain/embeds";

export const revalidate = 60;

const DEFAULT_TITLE = "Conócenos";

async function loadVisitPage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  const center = slug ? await centerRepository.findBySlug(slug) : null;
  if (!center) return null;
  const [config, aboutPage] = await Promise.all([
    siteConfigRepository.findByCenterId(center.id),
    aboutPageRepository.findByCenterId(center.id),
  ]);
  if (!config?.visitVisible) return null;
  const photos = (aboutPage?.images ?? [])
    .filter((i) => i.visible && i.category === "ESPACIO")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return { config, photos };
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadVisitPage();
  return buildSiteMetadata({
    path: "/conocenos",
    title: data?.config.visitTitle ?? DEFAULT_TITLE,
    description: data?.config.visitIntro ?? undefined,
    noIndex: !data,
  });
}

const EYEBROW = "text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]";
const H2 = "mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]";

export default async function ConocenosPage() {
  const data = await loadVisitPage();
  if (!data) notFound();
  const { config, photos } = data;

  const heroImage = config.visitHeroImageUrl ?? photos[0]?.imageUrl ?? null;
  const videoUrl = videoEmbedUrl(config.visitVideoUrl);
  const expectations = splitLines(config.firstClassInfo);
  const address = config.contactAddress;

  return (
    <div className="pt-[var(--header-height)]">
      <section className="px-[var(--space-4)] py-[var(--space-16)] md:px-[var(--space-8)]" aria-labelledby="visit-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-[var(--space-10)] md:grid-cols-2">
          <div>
            <p className={EYEBROW}>Conócenos</p>
            <h1 id="visit-heading" className="mt-[var(--space-3)] text-hero font-display font-semibold leading-tight text-[var(--color-primary)]">
              {config.visitTitle ?? DEFAULT_TITLE}
            </h1>
            {config.visitIntro && (
              <p className="mt-[var(--space-4)] max-w-xl whitespace-pre-line text-lg leading-relaxed text-[var(--color-text-muted)]">
                {config.visitIntro}
              </p>
            )}
          </div>
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt="La sala" className="aspect-[4/5] w-full rounded-[var(--radius-xl)] object-cover shadow-[var(--shadow-md)] md:aspect-[4/3]" />
          )}
        </div>
      </section>

      {photos.length > 1 && (
        <section className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-16)] md:px-[var(--space-8)]" aria-labelledby="space-heading">
          <div className="mx-auto max-w-6xl">
            <p className={EYEBROW}>El espacio</p>
            <h2 id="space-heading" className={H2}>Así se ve la sala</h2>
            <div className="mt-[var(--space-8)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-3 md:gap-[var(--space-4)]">
              {photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.imageUrl} alt={p.caption ?? ""} loading="lazy" className="aspect-[4/5] w-full rounded-[var(--radius-md)] object-cover" />
              ))}
            </div>
          </div>
        </section>
      )}

      {videoUrl && (
        <section className="px-[var(--space-4)] py-[var(--space-16)] md:px-[var(--space-8)]" aria-labelledby="tour-heading">
          <div className="mx-auto max-w-4xl">
            <p className={EYEBROW}>Mini tour</p>
            <h2 id="tour-heading" className={H2}>Recorre la sala</h2>
            <iframe
              src={videoUrl}
              title="Video de la sala"
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              className="mt-[var(--space-8)] aspect-video w-full rounded-[var(--radius-xl)] border-0 shadow-[var(--shadow-md)]"
            />
          </div>
        </section>
      )}

      <FirstClassSection lines={expectations} headingId="visit-first-class-heading" />

      {address && (
        <section className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-16)] md:px-[var(--space-8)]" aria-labelledby="directions-heading">
          <div className="mx-auto grid max-w-6xl items-center gap-[var(--space-10)] md:grid-cols-2">
            <div>
              <p className={EYEBROW}>Cómo llegar</p>
              <h2 id="directions-heading" className={H2}>Dónde estamos</h2>
              <dl className="mt-[var(--space-6)] space-y-[var(--space-4)]">
                <div>
                  <dt className="text-sm font-semibold text-[var(--color-text)]">Dirección</dt>
                  <dd className="text-[var(--color-text-muted)]">{address}</dd>
                </div>
                {config.visitParking && (
                  <div>
                    <dt className="text-sm font-semibold text-[var(--color-text)]">Estacionamiento</dt>
                    <dd className="text-[var(--color-text-muted)]">{config.visitParking}</dd>
                  </div>
                )}
                {config.visitTransit && (
                  <div>
                    <dt className="text-sm font-semibold text-[var(--color-text)]">Transporte público</dt>
                    <dd className="text-[var(--color-text-muted)]">{config.visitTransit}</dd>
                  </div>
                )}
              </dl>
              <a
                href={googleMapsLink(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-[var(--space-6)] inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Abrir en Google Maps <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
            </div>
            <iframe
              src={googleMapsEmbedUrl(address)}
              title={`Mapa: ${address}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-[4/3] w-full rounded-[var(--radius-xl)] border-0 shadow-[var(--shadow-sm)]"
            />
          </div>
        </section>
      )}

      <section className="px-[var(--space-4)] py-[var(--space-16)] text-center md:px-[var(--space-8)]" aria-labelledby="visit-cta-heading">
        <h2 id="visit-cta-heading" className="text-section font-display font-semibold text-[var(--color-primary)]">¿Te animas a venir?</h2>
        <p className="mt-[var(--space-2)] text-[var(--color-text-muted)]">Revisa los horarios y reserva tu clase.</p>
        <Link
          href="/horarios"
          className="mt-[var(--space-6)] inline-flex rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-3)] text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          Ver horarios
        </Link>
      </section>
    </div>
  );
}
