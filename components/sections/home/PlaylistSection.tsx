import Link from "next/link";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { spotifyEmbedUrl } from "@/lib/domain/embeds";

type PlaylistSectionProps = {
  title?: string;
  subtitle?: string;
  /** Item de la sección: linkUrl = link de Spotify, description = texto, title/href = botón opcional. */
  item?: { title?: string; description?: string; linkUrl?: string; href?: string };
};

export function PlaylistSection({ title, subtitle, item }: PlaylistSectionProps) {
  const embedUrl = spotifyEmbedUrl(item?.linkUrl);
  if (!embedUrl) return null;

  return (
    <section
      id="playlist"
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-20)] md:px-[var(--space-8)] md:py-[var(--space-24)]"
      aria-labelledby="playlist-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-[var(--space-10)] md:grid-cols-2">
        <AnimateIn>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
            {subtitle ?? "Para practicar en casa"}
          </p>
          <h2
            id="playlist-heading"
            className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
          >
            {title ?? "Escucha nuestra playlist"}
          </h2>
          {item?.description && (
            <p className="mt-[var(--space-4)] max-w-md text-lg leading-relaxed text-[var(--color-text-muted)]">
              {item.description}
            </p>
          )}
          {item?.title && item.href && (
            <Link
              href={item.href}
              className="mt-[var(--space-6)] inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              {item.title} <span aria-hidden>→</span>
            </Link>
          )}
        </AnimateIn>
        <AnimateIn delay={0.1}>
          <iframe
            src={embedUrl}
            title={title ?? "Playlist de Spotify"}
            width="100%"
            height="352"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="rounded-[var(--radius-xl)] border-0 shadow-[var(--shadow-md)]"
          />
        </AnimateIn>
      </div>
    </section>
  );
}
