import {
  planRepository,
  planCategoryQuotaRepository,
  onDemandCategoryRepository,
} from "@/lib/adapters/db";
import { buildLibraryPacks, type LibraryPack } from "@/lib/domain/library-pack";

/** Packs de la Biblioteca Virtual que se pueden comprar hoy (planes no archivados). */
export async function getLibraryPacks(centerId: string): Promise<LibraryPack[]> {
  const [plans, categories] = await Promise.all([
    planRepository.findManyByCenterId(centerId),
    onDemandCategoryRepository.findPublishedByCenterId(centerId),
  ]);
  const onDemandPlanIds = plans.filter((p) => p.type === "ON_DEMAND").map((p) => p.id);
  const quotas = await planCategoryQuotaRepository.findByPlanIds(onDemandPlanIds);
  return buildLibraryPacks(plans, quotas, categories);
}
