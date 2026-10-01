import type { Metadata } from "next";
import { onDemandCategoryRepository, centerRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import { PublicCatalog } from "@/components/biblioteca/PublicCatalog";
import type { CategoryData } from "@/components/biblioteca/types";
import { buildSiteMetadata } from "@/lib/seo/metadata";
import { getLibraryPacks } from "@/lib/application/get-library-packs";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildSiteMetadata({
    path: "/catalogo",
    title: "Catálogo de prácticas — Cuerpo Raíz",
    description:
      "Explora nuestras categorías de prácticas de yoga on demand: clases grabadas para practicar a tu ritmo, donde y cuando quieras.",
  });
}

async function resolveCenter() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (slug) {
    const bySlug = await centerRepository.findBySlug(slug);
    if (bySlug) return bySlug;
  }
  return prisma.center.findFirst();
}

export default async function CatalogoPage() {
  const center = await resolveCenter();
  if (!center) return <p className="p-8 text-[var(--color-text-muted)]">Centro no configurado.</p>;

  const [categoriesTree, packs] = await Promise.all([
    onDemandCategoryRepository.findPublishedTreeByCenterId(center.id),
    getLibraryPacks(center.id),
  ]);
  const categories: CategoryData[] = categoriesTree.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description ?? null,
    thumbnailUrl: cat.thumbnailUrl ?? null,
    practices: cat.practices.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      thumbnailUrl: p.thumbnailUrl ?? null,
      categoryId: cat.id,
      lessons: p.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        durationMinutes: l.durationMinutes,
        level: l.level,
        intensity: l.intensity,
        targetAudience: l.targetAudience,
        equipment: l.equipment,
        tags: l.tags,
        thumbnailUrl: l.thumbnailUrl,
        promoVideoUrl: l.promoVideoUrl,
        videoUrl: null,
        practiceId: l.practiceId,
      })),
    })),
  }));

  return <PublicCatalog categories={categories} packs={packs} />;
}
