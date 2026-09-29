import Link from "next/link";
import {
  describePackContents,
  buyPlanHref,
  packsForCategory,
  type LibraryPack,
} from "@/lib/domain/library-pack";
import { formatMoney } from "@/lib/domain/money";

const SECURE_PAYMENT_COPY = "Pago seguro a través de MercadoPago";

/** Tarjetas de compra de cada pack (vista pública del catálogo). */
export function LibraryPackOffers({ packs }: { packs: LibraryPack[] }) {
  if (packs.length === 0) return null;
  return (
    <section aria-labelledby="packs-heading" className="mb-8">
      <h2 id="packs-heading" className="sr-only">
        Packs disponibles
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {packs.map((pack) => (
          <li
            key={pack.planId}
            className="flex flex-col gap-3 rounded-[var(--radius-lg)] border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]"
          >
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-primary)]">{pack.name}</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{describePackContents(pack)}</p>
            </div>
            <p className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[var(--color-primary)]">
                {formatMoney(pack.amountCents, pack.currency)}
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {pack.lifetime ? "pago único · tuyas para siempre" : "pago único"}
              </span>
            </p>
            <Link
              href={buyPlanHref(pack.planId)}
              className="mt-auto inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-secondary)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-secondary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary)]"
            >
              Comprar pack →
            </Link>
            <p className="text-center text-xs text-[var(--color-text-muted)]">🔒 {SECURE_PAYMENT_COPY}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Línea bajo cada categoría: en qué pack viene y a qué precio. */
export function CategoryPackNote({ packs, categoryId }: { packs: LibraryPack[]; categoryId: string }) {
  const matching = packsForCategory(packs, categoryId);
  if (matching.length === 0) return null;
  return (
    <p className="mb-3 text-xs text-[var(--color-text)]">
      Incluida en{" "}
      {matching.map((pack, i) => (
        <span key={pack.planId}>
          {i > 0 && " · "}
          <Link
            href={buyPlanHref(pack.planId)}
            className="font-semibold text-[var(--color-secondary)] underline underline-offset-2"
          >
            {pack.name} ({formatMoney(pack.amountCents, pack.currency)})
          </Link>
        </span>
      ))}
    </p>
  );
}
