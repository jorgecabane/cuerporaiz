import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRole } from "@/lib/domain/role";
import {
  onDemandCategoryRepository,
  onDemandPracticeRepository,
  onDemandLessonRepository,
  lessonUnlockRepository,
  userPlanRepository,
  planRepository,
  planCategoryQuotaRepository,
} from "@/lib/adapters/db";
import { getCategoryQuotaUsage } from "@/lib/application/get-category-quota-usage";
import { OnDemandCatalog } from "@/components/panel/on-demand/OnDemandCatalog";

export default async function OnDemandPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const { id: userId, centerId, role } = session.user;

  if (isAdminRole(role)) redirect("/panel/on-demand/categorias");

  const [categories, allUserPlans] = await Promise.all([
    onDemandCategoryRepository.findPublishedByCenterId(centerId),
    userPlanRepository.findActiveByUserAndCenter(userId, centerId),
  ]);

  // Find an on-demand plan
  const planIds = allUserPlans.map((up) => up.planId);
  const plans = planIds.length > 0 ? await planRepository.findManyByIds(planIds) : [];
  const onDemandUserPlan = allUserPlans.find((up) => {
    const plan = plans.find((p) => p.id === up.planId);
    return plan?.type === "ON_DEMAND" || plan?.type === "MEMBERSHIP_ON_DEMAND";
  });

  // No plan — show CTA
  if (!onDemandUserPlan) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-[var(--color-primary)] mb-2">
          Clases On Demand
        </h1>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="text-[var(--color-text-muted)] mb-4">
            No tienes un plan on demand activo. Adquiere uno para acceder al catálogo de clases.
          </p>
          <Link
            href="/panel/tienda"
            className="inline-block rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Compra un plan on demand
          </Link>
        </div>
      </div>
    );
  }

  // Load practices and lessons for published categories
  const categoriesWithContent = await Promise.all(
    categories.map(async (cat) => {
      const practices = await onDemandPracticeRepository.findPublishedByCategoryId(cat.id);
      const practicesWithLessons = await Promise.all(
        practices.map(async (practice) => {
          const lessons = await onDemandLessonRepository.findPublishedByPracticeId(practice.id);
          return {
            id: practice.id,
            name: practice.name,
            description: practice.description,
            lessons: lessons.map((l) => ({
              id: l.id,
              title: l.title,
              durationMinutes: l.durationMinutes,
              level: l.level,
              thumbnailUrl: l.thumbnailUrl,
              videoUrl: null as string | null, // not exposed until unlocked
              practiceId: l.practiceId,
            })),
          };
        }),
      );
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        thumbnailUrl: cat.thumbnailUrl,
        practices: practicesWithLessons,
      };
    }),
  );

  const [unlocks, quotaUsage] = await Promise.all([
    lessonUnlockRepository.findByUserId(userId),
    getCategoryQuotaUsage(onDemandUserPlan.planId, onDemandUserPlan.id, {
      quotaRepo: planCategoryQuotaRepository,
      unlockRepo: lessonUnlockRepository,
    }),
  ]);

  const unlockedLessonIds = unlocks.map((u) => u.lessonId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="font-display text-2xl font-bold text-[var(--color-primary)]">
          Clases On Demand
        </h1>
        <Link
          href="/panel/on-demand/mis-clases"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          Mis clases desbloqueadas
        </Link>
      </div>
      <p className="text-[var(--color-text-muted)] mb-6">
        Explora el catálogo y desbloquea las clases que quieras.
      </p>

      {categoriesWithContent.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            Aún no hay contenido publicado. Vuelve pronto.
          </p>
        </div>
      ) : (
        <OnDemandCatalog
          categories={categoriesWithContent}
          unlockedLessonIds={unlockedLessonIds}
          quotaUsage={quotaUsage}
        />
      )}
    </div>
  );
}
