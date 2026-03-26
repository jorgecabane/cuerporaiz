import type { Metadata } from "next";
import {
  centerRepository,
  siteConfigRepository,
  siteSectionRepository,
  planRepository,
  disciplineRepository,
  prisma,
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

  // Build on-demand cards from DB plans + section items for customization
  const onDemandPlans = plans.filter((p) => p.type === "ON_DEMAND");
  const membershipPlans = plans.filter((p) => p.type === "MEMBERSHIP_ON_DEMAND");
  const onDemandSection = sectionMap.get("on-demand");
  const onDemandItems = onDemandSection?.items ?? [];

  const ofertaCards: {
    tag: string; title: string; description: string; price: string;
    href: string; variant: "primary" | "secondary"; image: string; imageAlt: string;
  }[] = [];

  // On-demand card (only if there are ON_DEMAND plans)
  if (onDemandPlans.length > 0) {
    const minPrice = Math.min(...onDemandPlans.map((p) => p.amountCents));
    const item = onDemandItems.find((i) => i.sortOrder === 0) ?? onDemandItems[0];
    ofertaCards.push({
      tag: item?.linkUrl ?? "Packs online",
      title: item?.title ?? "Practica a tu ritmo",
      description: item?.description ?? "Clases grabadas por tipo de práctica. Acceso por tiempo definido.",
      price: `Desde $${minPrice.toLocaleString("es-CL")}`,
      href: "/catalogo",
      variant: "primary",
      image: item?.imageUrl ?? "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
      imageAlt: item?.title ?? "Práctica de yoga on demand",
    });
  }

  // Membership card (only if there are MEMBERSHIP_ON_DEMAND plans)
  if (membershipPlans.length > 0) {
    const minPrice = Math.min(...membershipPlans.map((p) => p.amountCents));
    const item = onDemandItems.find((i) => i.sortOrder === 1) ?? onDemandItems[1];
    ofertaCards.push({
      tag: item?.linkUrl ?? "Membresía",
      title: item?.title ?? "Siempre actualizada",
      description: item?.description ?? "Acceso a todo el contenido on demand mientras estés activa.",
      price: `$${minPrice.toLocaleString("es-CL")} / mes`,
      href: "/membresia",
      variant: "secondary",
      image: item?.imageUrl ?? "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
      imageAlt: item?.title ?? "Membresía on demand",
    });
  }

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
                eyebrow={section.subtitle ?? undefined}
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
              <OfertaSection
                key={section.id}
                title={section.title ?? undefined}
                subtitle={section.subtitle ?? undefined}
                cards={ofertaCards}
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
