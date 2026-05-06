import type { Metadata } from "next";
import { onDemandCategoryRepository } from "@/lib/adapters/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BibliotecaShell } from "@/components/biblioteca/BibliotecaShell";
import type { CategoryData } from "@/components/biblioteca/types";
import { buildSiteMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

interface Props {
  params: Promise<{ categoryId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoryId } = await params;
  const category = await onDemandCategoryRepository.findById(categoryId);
  if (!category || category.status !== "PUBLISHED") {
    return buildSiteMetadata({ path: `/catalogo/${categoryId}`, noIndex: true });
  }
  return buildSiteMetadata({
    path: `/catalogo/${categoryId}`,
    title: `${category.name} — Catálogo`,
    description: category.description ?? undefined,
    image: category.thumbnailUrl,
  });
}

export default async function CatalogoCategoryPage({ params }: Props) {
  const { categoryId } = await params;
  const category = await onDemandCategoryRepository.findById(categoryId);
  if (!category || category.status !== "PUBLISHED") notFound();

  // El shell se renderiza con TODAS las categorías del centro: así, en la vista 2 (práctica)
  // el shell tiene contexto suficiente para resolver categoryName y armar breadcrumb.
  const tree = await onDemandCategoryRepository.findPublishedTreeByCenterId(category.centerId);
  const filtered = tree.filter((c) => c.id === categoryId);
  const categories: CategoryData[] = filtered.map((cat) => ({
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

  return (
    <div className="px-4 py-6 sm:py-12 pt-[calc(var(--header-height)+var(--space-4))]">
      <Suspense fallback={null}>
        <BibliotecaShell
          categories={categories}
          mode={{ kind: "public" }}
          routingMode="path"
          basePath="/catalogo"
          selectedCategoryId={categoryId}
          title={category.name}
          subtitle={category.description ?? undefined}
        />
      </Suspense>
    </div>
  );
}
