import Link from "next/link";
import type { CategoryData, PracticeData } from "./types";
import {
  buyPlanHref,
  describePackContents,
  packsForCategory,
  type LibraryPack,
} from "@/lib/domain/library-pack";
import { formatMoney } from "@/lib/domain/money";
import { formatCount } from "@/lib/domain/format-count";

const MAX_LESSONS_PREVIEW = 4;
const EYEBROW = "text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]";

/**
 * Portada pública de la Biblioteca Virtual (/catalogo), estilo "editorial":
 * pack arriba y una franja por categoría (foto + texto fijos a la izquierda en
 * desktop, prácticas con su lista de clases a la derecha).
 */
export function PublicCatalog({ categories, packs }: { categories: CategoryData[]; packs: LibraryPack[] }) {
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-[var(--space-4)] pb-[var(--space-10)] pt-[var(--space-10)] md:px-[var(--space-8)]">
        <h1 className="text-section font-display font-semibold text-[var(--color-primary)]">Biblioteca virtual</h1>
        <p className="mt-[var(--space-3)] max-w-2xl text-lg text-[var(--color-text-muted)]">
          Practica a tu ritmo con clases grabadas de yoga y meditación. Las compras una vez y son tuyas para siempre.
        </p>
        {categories.length === 0 && (
          <p className="mt-[var(--space-8)] rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-6)] text-[var(--color-text-muted)]">
            Aún no hay contenido disponible. Vuelve pronto.
          </p>
        )}
        {packs.map((pack) => (
          <PackOffer key={pack.planId} pack={pack} />
        ))}
      </div>

      {categories.map((category, i) => (
        <CategoryBand key={category.id} category={category} packs={packs} alt={i % 2 === 0} />
      ))}

      <div className="mx-auto w-full max-w-6xl px-[var(--space-4)] py-[var(--space-12)] text-center md:px-[var(--space-8)]">
        <p className="text-[var(--color-text-muted)]">
          ¿Ya compraste un pack?{" "}
          <Link
            href={`/auth/login?callbackUrl=${encodeURIComponent("/panel/replay")}`}
            className="font-medium text-[var(--color-primary)] underline underline-offset-4"
          >
            Inicia sesión para ver tus clases
          </Link>
        </p>
      </div>
    </>
  );
}

function PackOffer({ pack }: { pack: LibraryPack }) {
  return (
    <section
      aria-label={`Pack ${pack.name}`}
      className="mt-[var(--space-8)] grid items-center gap-[var(--space-5)] rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-sm)] md:grid-cols-[1fr_auto] md:px-[var(--space-8)]"
    >
      <div>
        <p className={EYEBROW}>Pack de la biblioteca</p>
        <h2 className="mt-[var(--space-1)] font-display text-3xl font-semibold text-[var(--color-primary)]">{pack.name}</h2>
        <p className="mt-[var(--space-2)] text-[var(--color-text-muted)]">{describePackContents(pack)}</p>
      </div>
      <div className="flex flex-col items-stretch gap-[var(--space-2)] text-center md:min-w-56">
        <p className="font-display text-4xl font-semibold leading-none text-[var(--color-primary)]">
          {formatMoney(pack.amountCents, pack.currency)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">{pack.lifetime ? "pago único · tuyas para siempre" : "pago único"}</p>
        <Link
          href={buyPlanHref(pack.planId)}
          className="mt-[var(--space-1)] rounded-[var(--radius-md)] bg-[var(--color-secondary)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-semibold text-white transition-colors hover:bg-[var(--color-secondary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary)]"
        >
          Comprar pack →
        </Link>
        <p className="text-xs text-[var(--color-text-muted)]">🔒 Pago seguro a través de MercadoPago</p>
      </div>
    </section>
  );
}

function CategoryBand({ category, packs, alt }: { category: CategoryData; packs: LibraryPack[]; alt: boolean }) {
  const lessonCount = category.practices.reduce((sum, p) => sum + p.lessons.length, 0);
  const headingId = `categoria-${category.id}`;
  const includedIn = packsForCategory(packs, category.id);

  return (
    <section
      aria-labelledby={headingId}
      className={`px-[var(--space-4)] py-[var(--space-16)] md:px-[var(--space-8)] md:py-[var(--space-20)] ${alt ? "bg-[var(--color-surface)]" : ""}`}
    >
      <div className="mx-auto grid max-w-6xl gap-[var(--space-10)] md:grid-cols-[5fr_7fr] md:items-start md:gap-[var(--space-12)]">
        <div className="md:sticky md:top-[calc(var(--header-height)+var(--space-6))]">
          {category.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.thumbnailUrl}
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-full rounded-[var(--radius-xl)] object-cover shadow-[var(--shadow-md)]"
            />
          )}
          <p className={`${EYEBROW} mt-[var(--space-6)] text-[var(--color-text-muted)]`}>
            {formatCount(lessonCount, "clase", "clases")} · {formatCount(category.practices.length, "práctica", "prácticas")}
          </p>
          <h2 id={headingId} className="mt-[var(--space-2)] text-section font-display font-semibold leading-tight text-[var(--color-primary)]">
            {category.name}
          </h2>
          {category.description && (
            <p className="mt-[var(--space-4)] whitespace-pre-line text-lg leading-relaxed text-[var(--color-text-muted)]">
              {category.description}
            </p>
          )}
          <Link
            href={`/catalogo/${category.id}`}
            className="mt-[var(--space-4)] inline-block text-sm font-semibold text-[var(--color-secondary)] underline-offset-4 hover:underline"
          >
            Ver todo <span aria-hidden>→</span>
            <span className="sr-only"> de {category.name}</span>
          </Link>
          {includedIn.length > 0 && (
            <p className="mt-[var(--space-4)] text-sm text-[var(--color-text)]">
              Incluida en{" "}
              {includedIn.map((pack, i) => (
                <span key={pack.planId}>
                  {i > 0 && " · "}
                  <Link href={buyPlanHref(pack.planId)} className="font-semibold text-[var(--color-primary)] underline underline-offset-2">
                    {pack.name} ({formatMoney(pack.amountCents, pack.currency)})
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>

        <ul className="grid gap-[var(--space-4)]">
          {category.practices.map((practice) => (
            <li key={practice.id}>
              <PracticeRow practice={practice} href={`/catalogo/${category.id}/${practice.id}`} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PracticeRow({ practice, href }: { practice: PracticeData; href: string }) {
  const lessons = practice.lessons;
  const soon = lessons.length === 0;
  const content = (
    <>
      <div className="aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-[var(--radius-lg)] sm:w-48">
        {practice.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={practice.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]" />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] font-display text-3xl text-white/85">
            {practice.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-2xl font-semibold leading-tight text-[var(--color-primary)]">{practice.name}</h3>
        {practice.description && <p className="mt-[var(--space-1)] text-[var(--color-text-muted)]">{practice.description}</p>}
        {soon ? (
          <span className="mt-[var(--space-3)] inline-block rounded-full bg-[var(--color-tertiary)] px-[var(--space-3)] py-[var(--space-1)] text-xs font-semibold text-[var(--color-primary)]">
            Próximamente
          </span>
        ) : (
          <>
            <ul className="mt-[var(--space-3)] text-sm text-[var(--color-text-muted)]">
              {lessons.slice(0, MAX_LESSONS_PREVIEW).map((lesson) => (
                <li key={lesson.id} className="flex justify-between gap-[var(--space-4)] border-t border-dashed border-[var(--color-border)] py-[var(--space-1)]">
                  <span className="min-w-0 truncate">{lesson.title}</span>
                  {lesson.durationMinutes != null && <span className="shrink-0">{lesson.durationMinutes} min</span>}
                </li>
              ))}
            </ul>
            <span className="mt-[var(--space-2)] inline-block text-sm font-semibold text-[var(--color-primary)]">
              {lessons.length > MAX_LESSONS_PREVIEW ? `Ver las ${lessons.length} clases →` : "Ver práctica →"}
            </span>
          </>
        )}
      </div>
    </>
  );

  const rowClass =
    "flex items-start gap-[var(--space-4)] rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-4)] sm:items-center sm:gap-[var(--space-5)]";

  if (soon) return <div className={rowClass}>{content}</div>;
  return (
    <Link
      href={href}
      className={`group ${rowClass} transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`}
    >
      {content}
    </Link>
  );
}
