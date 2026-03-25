import type { Metadata } from "next";
import {
  centerRepository,
  siteConfigRepository,
  siteSectionRepository,
  planRepository,
  disciplineRepository,
} from "@/lib/adapters/db";
import {
  HeroSection,
  PropuestaSection,
  ComoFuncionaSection,
  AgendaSection,
  OfertaSection,
  TestimoniosSection,
  SobreTriniSection,
  CtaSection,
  DisciplinesSection,
  ContactSection,
} from "@/components/sections/home";
import type { SiteSectionWithItems } from "@/lib/domain/site-config";

export const revalidate = 60;

/* ─── Metadata ──────────────────────────────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  const slug = process.env.DEFAULT_CENTER_SLUG;
  if (!slug) return { title: "Cuerpo Raíz" };

  const center = await centerRepository.findBySlug(slug);
  if (!center) return { title: "Cuerpo Raíz" };

  const siteConfig = await siteConfigRepository.findByCenterId(center.id);
  const description = siteConfig?.heroSubtitle ?? "el camino de regreso a ti.";

  return {
    title: center.name,
    description,
  };
}

/* ─── Fallback (no env slug configured) ─────────────────────────────────── */

function FallbackHome() {
  return (
    <>
      <HeroSection />
      <PropuestaSection />
      <ComoFuncionaSection />
      <AgendaSection />
      <OfertaSection />
      <TestimoniosSection />
      <SobreTriniSection />
      <CtaSection />
    </>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function buildSectionMap(sections: SiteSectionWithItems[]) {
  const map = new Map<string, SiteSectionWithItems>();
  for (const s of sections) {
    map.set(s.sectionKey, s);
  }
  return map;
}

function serializeItems(items: SiteSectionWithItems["items"]) {
  return items.map((i) => ({
    title: i.title ?? undefined,
    description: i.description ?? undefined,
    imageUrl: i.imageUrl ?? undefined,
    linkUrl: i.linkUrl ?? undefined,
  }));
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const slug = process.env.DEFAULT_CENTER_SLUG;
  if (!slug) return <FallbackHome />;

  const center = await centerRepository.findBySlug(slug);
  if (!center) return <FallbackHome />;

  // Parallel queries
  const [siteConfig, sections, plans, disciplines] = await Promise.all([
    siteConfigRepository.findByCenterId(center.id),
    siteSectionRepository.findByCenterId(center.id),
    planRepository.findManyByCenterId(center.id),
    disciplineRepository.findActiveByCenterId(center.id),
  ]);

  // If no sections configured, show fallback with default order
  if (sections.length === 0) return <FallbackHome />;

  const sectionMap = buildSectionMap(sections);

  // Filter to visible sections, sorted by sortOrder
  const visibleSections = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Prepare live plans for AgendaSection
  const livePlans = plans
    .filter((p) => p.type === "LIVE")
    .map((p) => ({
      name: p.name,
      amountCents: p.amountCents,
      currency: p.currency,
      validityDays: p.validityDays ?? undefined,
      maxReservations: p.maxReservations ?? undefined,
      highlight: false,
    }));

  // Serialize disciplines for DisciplinesSection
  const serializedDisciplines = disciplines.map((d) => ({
    name: d.name,
    color: d.color,
  }));

  return (
    <>
      {visibleSections.map((section) => {
        const items = serializeItems(section.items);

        switch (section.sectionKey) {
          case "hero":
            return (
              <HeroSection
                key={section.id}
                title={siteConfig?.heroTitle ?? undefined}
                subtitle={siteConfig?.heroSubtitle ?? undefined}
                imageUrl={siteConfig?.heroImageUrl ?? undefined}
              />
            );

          case "about":
            return (
              <PropuestaSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                items={items.length > 0 ? items : undefined}
              />
            );

          case "how-it-works":
            return (
              <ComoFuncionaSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                items={items.length > 0 ? items : undefined}
              />
            );

          case "schedule":
            return (
              <AgendaSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                livePlans={livePlans.length > 0 ? livePlans : undefined}
              />
            );

          case "plans":
            // Plans section is rendered as part of AgendaSection (schedule + plans sidebar).
            // Skip standalone rendering to avoid duplication.
            return null;

          case "on-demand":
            return (
              <OfertaSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                visible={section.visible}
              />
            );

          case "testimonials":
            return (
              <TestimoniosSection
                key={section.id}
                title={section.title ?? undefined}
                items={items.length > 0 ? items : undefined}
              />
            );

          case "team":
            return (
              <SobreTriniSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                items={items.length > 0 ? items : undefined}
              />
            );

          case "cta":
            return (
              <CtaSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                whatsappUrl={siteConfig?.whatsappUrl ?? undefined}
              />
            );

          case "disciplines":
            return (
              <DisciplinesSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                disciplines={serializedDisciplines}
              />
            );

          case "contact":
            return (
              <ContactSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                email={siteConfig?.contactEmail ?? undefined}
                phone={siteConfig?.contactPhone ?? undefined}
                address={siteConfig?.contactAddress ?? undefined}
                instagramUrl={siteConfig?.instagramUrl ?? undefined}
                facebookUrl={siteConfig?.facebookUrl ?? undefined}
                whatsappUrl={siteConfig?.whatsappUrl ?? undefined}
                youtubeUrl={siteConfig?.youtubeUrl ?? undefined}
              />
            );

          default:
            return null;
        }
      })}
    </>
  );
}
