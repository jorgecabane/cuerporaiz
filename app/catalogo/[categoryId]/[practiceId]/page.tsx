import type { Metadata } from "next";
import {
  onDemandCategoryRepository,
  onDemandPracticeRepository,
} from "@/lib/adapters/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BibliotecaShell } from "@/components/biblioteca/BibliotecaShell";
import type { CategoryData } from "@/components/biblioteca/types";
import { buildSiteMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

interface Props {
  params: Promise<{ categoryId: string; practiceId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoryId, practiceId } = await params;
  const practice = await onDemandPracticeRepository.findById(practiceId);
  const path = `/catalogo/${categoryId}/${practiceId}`;
  if (
    !practice ||
    practice.status !== "PUBLISHED" ||
    practice.categoryId !== categoryId
  ) {
    return buildSiteMetadata({ path, noIndex: true });
  }
  return buildSiteMetadata({
    path,
    title: `${practice.name} — Práctica on demand`,
    description: practice.description ?? undefined,
    image: practice.thumbnailUrl,
  });
}

export default async function CatalogoPracticePage({ params }: Props) {
  const { categoryId, practiceId } = await params;

  const [category, practice] = await Promise.all([
    onDemandCategoryRepository.findById(categoryId),
    onDemandPracticeRepository.findById(practiceId),
  ]);

  if (!category || category.status !== "PUBLISHED") notFound();
  if (
    !practice ||
    practice.status !== "PUBLISHED" ||
    practice.categoryId !== category.id
  ) {
    notFound();
  }

  // Tree filtrado a la categoría actual (la vista 2 del shell solo necesita la práctica
  // y sus hermanas para la barra "back").
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
          selectedPracticeId={practiceId}
        />
      </Suspense>
    </div>
  );
}
