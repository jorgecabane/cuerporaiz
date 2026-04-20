import Image from "next/image";
import Link from "next/link";

const LESSONS = [
  { title: "Hatha suave para la mañana", duration: "35 min", teacher: "Trini", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80" },
  { title: "Meditación al amanecer", duration: "15 min", teacher: "Trini", image: "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=600&q=80" },
  { title: "Vinyasa para soltar", duration: "50 min", teacher: "Sofi", image: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=600&q=80" },
  { title: "Yin restaurativo", duration: "45 min", teacher: "Trini", image: "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=600&q=80" },
  { title: "Pranayama y silencio", duration: "20 min", teacher: "Sofi", image: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=600&q=80" },
  { title: "Somática al final del día", duration: "30 min", teacher: "Trini", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80" },
];

export function VariantBPreview() {
  return (
    <section
      className="bg-[var(--color-bg)] px-[var(--space-4)] py-[var(--space-24)] md:px-[var(--space-8)] md:py-[var(--space-32)]"
      aria-labelledby="mock-lib-preview-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-[var(--space-6)] md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
              Biblioteca virtual
            </p>
            <h2
              id="mock-lib-preview-heading"
              className="mt-[var(--space-3)] text-section font-display font-semibold text-[var(--color-primary)]"
            >
              Clases listas para ti
            </h2>
            <p className="mt-[var(--space-3)] max-w-xl text-base leading-relaxed text-[var(--color-text-muted)]">
              Un vistazo a lo que desbloqueas con un plan de biblioteca virtual.
            </p>
          </div>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-[var(--space-2)] text-sm font-medium text-[var(--color-primary)] underline underline-offset-4 transition-colors duration-[var(--duration-base)] hover:text-[var(--color-secondary)]"
          >
            Ver todo el catálogo
            <span aria-hidden>→</span>
          </Link>
        </div>

        <ul className="mt-[var(--space-10)] grid gap-[var(--space-5)] sm:grid-cols-2 lg:grid-cols-3">
          {LESSONS.map((lesson, i) => (
            <li key={lesson.title}>
              <article className="group relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--duration-slow)] hover:shadow-[var(--shadow-md)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={lesson.image}
                    alt={lesson.title}
                    fill
                    className="object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Lock overlay for locked items */}
                  {i >= 2 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-primary)]/55 opacity-100 transition-opacity duration-[var(--duration-slow)] group-hover:opacity-90">
                      <div className="flex flex-col items-center gap-[var(--space-2)] text-white">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="text-xs font-medium uppercase tracking-[0.15em]">
                          Con plan
                        </span>
                      </div>
                    </div>
                  )}
                  <span className="absolute bottom-[var(--space-3)] right-[var(--space-3)] rounded-full bg-black/60 px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-white backdrop-blur-sm">
                    {lesson.duration}
                  </span>
                </div>
                <div className="p-[var(--space-5)]">
                  <h3 className="font-display text-lg font-semibold text-[var(--color-primary)]">
                    {lesson.title}
                  </h3>
                  <p className="mt-[var(--space-1)] text-xs text-[var(--color-text-muted)]">
                    con {lesson.teacher}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-[var(--space-10)] flex justify-center">
          <Link
            href="/panel/tienda"
            className="inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-3)] text-sm font-medium text-white transition-colors duration-[var(--duration-base)] hover:bg-[var(--color-primary-hover)]"
          >
            Desbloquear la biblioteca
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
