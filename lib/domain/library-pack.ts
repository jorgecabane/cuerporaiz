/**
 * Packs de la Biblioteca Virtual: planes ON_DEMAND (N clases a elección por categoría,
 * vía PlanCategoryQuota) y MEMBERSHIP_ON_DEMAND (acceso a toda la biblioteca).
 */

type PackPlanInput = {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  type: string;
  validityDays: number | null;
  validityPeriod: string | null;
};

type QuotaInput = { planId: string; categoryId: string; maxLessons: number };
type CategoryInput = { id: string; name: string };

export interface LibraryPackInclude {
  categoryId: string;
  categoryName: string;
  maxLessons: number;
}

export interface LibraryPack {
  planId: string;
  name: string;
  amountCents: number;
  currency: string;
  /** MEMBERSHIP_ON_DEMAND: acceso a todas las categorías, sin cuotas. */
  unlimited: boolean;
  /** Sin vigencia configurada → la compra no vence. */
  lifetime: boolean;
  includes: LibraryPackInclude[];
}

/** Arma los packs vendibles. Omite planes ON_DEMAND sin ninguna categoría publicada. */
export function buildLibraryPacks(
  plans: PackPlanInput[],
  quotas: QuotaInput[],
  publishedCategories: CategoryInput[]
): LibraryPack[] {
  const categoryName = new Map(publishedCategories.map((c) => [c.id, c.name]));
  const packs: LibraryPack[] = [];
  for (const plan of plans) {
    if (plan.type !== "ON_DEMAND" && plan.type !== "MEMBERSHIP_ON_DEMAND") continue;
    const unlimited = plan.type === "MEMBERSHIP_ON_DEMAND";
    const includes = unlimited
      ? []
      : quotas
          .filter((q) => q.planId === plan.id && categoryName.has(q.categoryId))
          .map((q) => ({ categoryId: q.categoryId, categoryName: categoryName.get(q.categoryId)!, maxLessons: q.maxLessons }));
    if (!unlimited && includes.length === 0) continue;
    packs.push({
      planId: plan.id,
      name: plan.name,
      amountCents: plan.amountCents,
      currency: plan.currency,
      unlimited,
      lifetime: plan.validityDays == null && plan.validityPeriod == null,
      includes,
    });
  }
  return packs;
}

export function packsForCategory(packs: LibraryPack[], categoryId: string): LibraryPack[] {
  return packs.filter((p) => p.unlimited || p.includes.some((i) => i.categoryId === categoryId));
}

/** "3 clases de Yoga + 1 clase de Meditaciones" / "Acceso a toda la biblioteca". */
export function describePackContents(pack: Pick<LibraryPack, "unlimited" | "includes">): string {
  if (pack.unlimited) return "Acceso a toda la biblioteca";
  return pack.includes
    .map((i) => `${i.maxLessons} ${i.maxLessons === 1 ? "clase" : "clases"} de ${i.categoryName}`)
    .join(" + ");
}


/** Lleva a comprar un plan: login (o registro) y luego la tienda con el plan destacado. */
export function buyPlanHref(planId: string): string {
  return `/auth/login?callbackUrl=${encodeURIComponent(`/panel/tienda?plan=${planId}`)}`;
}
