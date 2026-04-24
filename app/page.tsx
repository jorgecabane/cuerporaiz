import type { Metadata } from "next";
import {
  centerRepository,
  siteConfigRepository,
  siteSectionRepository,
  planRepository,
  disciplineRepository,
  onDemandCategoryRepository,
  prisma,
} from "@/lib/adapters/db";
import { buildSiteMetadata } from "@/lib/seo/metadata";
import {
  HeroSection,
  PropuestaSection,
  ComoFuncionaSection,
  AgendaSection,
  LibrarySection,
  TestimoniosSection,
  SobreTriniSection,
  CtaSection,
  DisciplinesSection,
  ContactSection,
  EventsSection,
  type UpcomingEvent,
} from "@/components/sections/home";
import type { SiteSectionWithItems } from "@/lib/domain/site-config";

export const revalidate = 60;

/* ─── Metadata ──────────────────────────────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata({ path: "/", type: "website" });
}

/* ─── Fallback (no env slug configured) ─────────────────────────────────── */

function FallbackHome() {
  return (
    <>
      <HeroSection />
      <PropuestaSection />
      <ComoFuncionaSection />
      <AgendaSection />
      <LibrarySection />
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
    href: i.href ?? undefined,
  }));
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
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

  // Query upcoming live classes for schedule section (next 7 days)
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const upcomingClasses = await prisma.liveClass.findMany({
    where: { centerId: center.id, startsAt: { gte: now, lte: weekFromNow }, status: "ACTIVE" },
    include: { discipline: true, reservations: { where: { status: "CONFIRMED" } } },
    orderBy: { startsAt: "asc" },
    take: 50,
  });

  const scheduleClasses = upcomingClasses.map((c) => ({
    time: c.startsAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" }),
    type: c.discipline?.name ?? c.title,
    duration: `${c.durationMinutes} min`,
    spotsUsed: c.reservations.length,
    spotsTotal: c.maxCapacity,
    dayOfWeek: new Date(c.startsAt.toLocaleString("en-US", { timeZone: "America/Santiago" })).getDay(),
  }));

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

  // Biblioteca virtual: datos para el bento (hero + categorías)
  const libraryPlans = plans.filter(
    (p) => p.type === "ON_DEMAND" || p.type === "MEMBERSHIP_ON_DEMAND"
  );
  const minLibraryPrice = libraryPlans.length
    ? Math.min(...libraryPlans.map((p) => p.amountCents))
    : null;
  const libraryPriceLabel =
    minLibraryPrice != null ? `Desde $${minLibraryPrice.toLocaleString("es-CL")}` : undefined;

  const publishedCategories = await onDemandCategoryRepository.findPublishedByCenterId(center.id);
  const libraryCategories = publishedCategories.slice(0, 3).map((c) => ({
    name: c.name,
    description: c.description ?? undefined,
    image: c.thumbnailUrl ?? undefined,
  }));

  // Próximos eventos (ventana de 60 días, máx 4)
  const sixtyDaysFromNow = new Date(now);
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  const upcomingEventRows = await prisma.event.findMany({
    where: {
      centerId: center.id,
      status: "PUBLISHED",
      startsAt: { gte: now, lte: sixtyDaysFromNow },
    },
    orderBy: { startsAt: "asc" },
    take: 4,
  });
  const upcomingEvents: UpcomingEvent[] = upcomingEventRows.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: e.startsAt.toISOString(),
    location: e.location,
    imageUrl: e.imageUrl,
    tag: null,
    priceLabel:
      e.amountCents === 0
        ? "Gratis"
        : e.currency === "CLP"
          ? `$${e.amountCents.toLocaleString("es-CL")}`
          : `${(e.amountCents / 100).toFixed(2)} ${e.currency}`,
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
                eyebrow={siteConfig?.heroEyebrow ?? section.subtitle ?? undefined}
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
                subtitle={siteConfig?.contactAddress ? `Presencial — ${siteConfig.contactAddress}` : (section.subtitle ?? undefined)}
                livePlans={livePlans.length > 0 ? livePlans : undefined}
                classes={scheduleClasses.length > 0 ? scheduleClasses : undefined}
              />
            );

          case "plans":
            // Plans section is rendered as part of AgendaSection (schedule + plans sidebar).
            // Skip standalone rendering to avoid duplication.
            return null;

          case "on-demand":
            return (
              <LibrarySection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                categories={libraryCategories.length > 0 ? libraryCategories : undefined}
                ctaPriceLabel={libraryPriceLabel}
              />
            );

          case "events":
            return (
              <EventsSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                events={upcomingEvents}
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
                items={section.items.map((i) => ({ title: i.title, description: i.description, linkUrl: i.linkUrl }))}
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
