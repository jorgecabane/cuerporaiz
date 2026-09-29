import Link from "next/link";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { ABOUT_IMAGE_CATEGORIES, type AboutImage } from "@/lib/domain/about-page";

const MAX_PHOTOS = 6;

type GallerySectionProps = {
  title?: string;
  subtitle?: string;
  images: AboutImage[];
};

/** Alterna categorías (retiros, clases, la sala) para que la franja muestre de todo. */
function pickMixed(images: AboutImage[], max: number): AboutImage[] {
  const queues = ABOUT_IMAGE_CATEGORIES.map((cat) =>
    images.filter((i) => i.visible && i.category === cat).sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const picked: AboutImage[] = [];
  while (picked.length < max && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && picked.length < max) picked.push(next);
    }
  }
  return picked;
}

export function GallerySection({ title, subtitle, images }: GallerySectionProps) {
  const photos = pickMixed(images, MAX_PHOTOS);
  if (photos.length === 0) return null;

  return (
    <section
      id="galeria"
      className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-20)] md:px-[var(--space-8)] md:py-[var(--space-24)]"
      aria-labelledby="galeria-heading"
    >
      <div className="mx-auto max-w-6xl">
        <AnimateIn className="flex flex-col gap-[var(--space-4)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
              {subtitle ?? "Galería"}
            </p>
            <h2
              id="galeria-heading"
              className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
            >
              {title ?? "En imágenes"}
            </h2>
          </div>
          <Link
            href="/sobre#galeria"
            className="text-sm font-medium text-[var(--color-secondary)] underline underline-offset-4"
          >
            Ver galería completa →
          </Link>
        </AnimateIn>

        <div className="mt-[var(--space-10)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-3 md:gap-[var(--space-4)]">
          {photos.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.imageUrl}
              alt={img.caption ?? ""}
              loading="lazy"
              className="aspect-[4/5] w-full rounded-[var(--radius-md)] object-cover shadow-[var(--shadow-sm)]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
