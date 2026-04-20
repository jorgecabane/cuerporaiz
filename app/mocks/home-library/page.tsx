import { notFound } from "next/navigation";
import { MockDivider } from "../_components/MockDivider";
import { VariantABento } from "./variant-a-bento";
import { VariantBPreview } from "./variant-b-preview";
import { VariantCEditorial } from "./variant-c-editorial";

export const metadata = {
  title: "Mocks — Biblioteca virtual en homepage",
  robots: { index: false, follow: false },
};

export default function MocksHomeLibraryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="pt-[var(--header-height,_4rem)]">
      <MockDivider
        label="Variante A — Bento grid"
        note="1 hero + 3 categorías. Máximo storytelling visual, se roba la pantalla."
      />
      <VariantABento />

      <MockDivider
        label="Variante B — Preview grid (Netflix-style)"
        note="6 thumbnails con overlay de candado. Genera FOMO visual de lo que hay adentro."
      />
      <VariantBPreview />

      <MockDivider
        label="Variante C — Editorial / testimonial"
        note="Imagen-manifiesto + bullets + CTA. Más calmada, encaja con el tono editorial del sitio."
      />
      <VariantCEditorial />

      <div className="bg-[var(--color-surface)] px-[var(--space-4)] py-[var(--space-12)] text-center">
        <p className="text-xs text-[var(--color-text-muted)]">
          Fin de mocks · borrar antes del merge a main
        </p>
      </div>
    </main>
  );
}
