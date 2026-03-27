import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import {
  onDemandCategoryRepository,
  lessonUnlockRepository,
  userPlanRepository,
  planRepository,
  planCategoryQuotaRepository,
} from "@/lib/adapters/db";
import { getCategoryQuotaUsage } from "@/lib/application/get-category-quota-usage";
import { ReplayShell } from "@/components/panel/replay/ReplayShell";
import Link from "next/link";
import { Suspense } from "react";

export default async function ReplayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const { id: userId, centerId, role } = session.user;

  if (isAdminRole(role)) redirect("/panel/on-demand/categorias");

  const [categoriesTree, allUserPlans] = await Promise.all([
    onDemandCategoryRepository.findPublishedTreeByCenterId(centerId),
    userPlanRepository.findActiveByUserAndCenter(userId, centerId),
  ]);

  const planIds = allUserPlans.map((up) => up.planId);
  const plans = planIds.length > 0 ? await planRepository.findManyByIds(planIds) : [];
  const onDemandUserPlan = allUserPlans.find((up) => {
    const plan = plans.find((p) => p.id === up.planId);
    return plan?.type === "ON_DEMAND" || plan?.type === "MEMBERSHIP_ON_DEMAND";
  });

  if (!onDemandUserPlan) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-2">Replay</h1>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="text-[var(--color-text-muted)] mb-4">
            No tienes un plan activo. Adquiere uno para acceder a las clases grabadas.
          </p>
          <Link
            href="/panel/tienda"
            className="inline-block rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Compra un plan
          </Link>
        </div>
      </div>
    );
  }

  const matchedPlan = plans.find((p) => p.id === onDemandUserPlan.planId);
  const unlimited = matchedPlan?.type === "MEMBERSHIP_ON_DEMAND";

  // Collect videoUrls during initial fetch to avoid re-querying later
  const videoUrlMap = new Map<string, string>();

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
            categoryId: cat.id,
            lessons: lessons.map((l) => {
              videoUrlMap.set(l.id, l.videoUrl);
              return {
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
                videoUrl: null as string | null,
                practiceId: l.practiceId,
              };
            }),
          };
        }),
      );
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description ?? null,
        practices: practicesWithLessons,
      };
    }),
  );

  const [unlocks, quotaUsage] = await Promise.all([
    lessonUnlockRepository.findByUserIdAndCenterId(userId, centerId),
    unlimited
      ? Promise.resolve([])
      : getCategoryQuotaUsage(onDemandUserPlan.planId, onDemandUserPlan.id, {
          quotaRepo: planCategoryQuotaRepository,
          unlockRepo: lessonUnlockRepository,
        }),
  ]);

  const unlockedLessonIds = unlocks.map((u) => u.lessonId);

  // Inject videoUrl for unlocked lessons from the map (no re-fetch needed)
  for (const cat of categoriesWithContent) {
    for (const practice of cat.practices) {
      for (const lesson of practice.lessons) {
        if (unlockedLessonIds.includes(lesson.id)) {
          lesson.videoUrl = videoUrlMap.get(lesson.id) ?? null;
        }
      }
    }
  }

  return (
    <div className="px-4 py-6 sm:py-12">
      <Suspense fallback={null}>
        <ReplayShell
          categories={categoriesWithContent}
          unlockedLessonIds={unlockedLessonIds}
          quotaUsage={quotaUsage}
          unlimited={unlimited}
        />
      </Suspense>
    </div>
  );
}
