import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { centerRepository, siteSectionRepository } from "@/lib/adapters/db";
import { buildSiteMetadata } from "@/lib/seo/metadata";
import { FaqSection } from "@/components/sections/home";
import { toFaqItems } from "@/lib/domain/site-config";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata({ path: "/preguntas-frecuentes", title: "Preguntas frecuentes" });
}

async function loadFaqSection() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return null;
  const center = await centerRepository.findBySlug(slug);
  if (!center) return null;
  const sections = await siteSectionRepository.findByCenterId(center.id);
  const faq = sections.find((s) => s.sectionKey === "faq");
  return faq?.visible ? faq : null;
}

export default async function PreguntasFrecuentesPage() {
  const faq = await loadFaqSection();
  const items = faq ? toFaqItems(faq.items) : [];
  if (items.length === 0) notFound();

  return (
    <div>
      <FaqSection
        title={faq?.title ?? undefined}
        subtitle={faq?.subtitle ?? undefined}
        items={items}
        headingLevel="h1"
      />
    </div>
  );
}
