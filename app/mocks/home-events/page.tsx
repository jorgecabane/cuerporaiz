import { notFound } from "next/navigation";
import { MockDivider } from "../_components/MockDivider";
import { VariantAScroll } from "./variant-a-scroll";
import { VariantBFeatured } from "./variant-b-featured";
import { VariantCTimeline } from "./variant-c-timeline";

export const metadata = {
  title: "Mocks — Eventos en homepage",
  robots: { index: false, follow: false },
};

export default function MocksHomeEventsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="pt-[var(--header-height,_4rem)]">
      <MockDivider
        label="Variante A — Carrusel horizontal"
        note="4+ eventos con snap. Ocupa poco alto, se puede escanear rápido. Mobile-first."
      />
      <VariantAScroll />

      <MockDivider
        label="Variante B — Featured + lista"
        note="1 evento hero grande + 3 secundarios con fecha prominente. Jerarquía clara."
      />
      <VariantBFeatured />

      <MockDivider
        label="Variante C — Timeline vertical"
        note="Línea de tiempo con círculos de fecha. Más calmada, estilo agenda editorial."
      />
      <VariantCTimeline />

      <div className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-12)] text-center">
        <p className="text-xs text-[var(--color-text-muted)]">
          Fin de mocks · borrar antes del merge a main
        </p>
      </div>
    </main>
  );
}
