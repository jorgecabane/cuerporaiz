import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  lessonUnlockRepository,
  onDemandLessonRepository,
  onDemandPracticeRepository,
  onDemandCategoryRepository,
  userPlanRepository,
} from "@/lib/adapters/db";
import { checkLessonAccess } from "@/lib/application/check-lesson-access";
import { VimeoEmbed } from "@/components/panel/on-demand/VimeoEmbed";

export default async function MisClasesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const userId = session.user.id;

  const unlocks = await lessonUnlockRepository.findByUserId(userId);

  const enrichedLessons = await Promise.all(
    unlocks.map(async (unlock) => {
      const lesson = await onDemandLessonRepository.findById(unlock.lessonId);
      if (!lesson) return null;

      const access = await checkLessonAccess(userId, unlock.lessonId, {
        unlockRepo: lessonUnlockRepository,
        userPlanRepo: userPlanRepository,
      });

      const practice = await onDemandPracticeRepository.findById(lesson.practiceId);
      const category = practice
        ? await onDemandCategoryRepository.findById(practice.categoryId)
        : null;

      return {
        id: lesson.id,
        title: lesson.title,
        durationMinutes: lesson.durationMinutes,
        level: lesson.level,
        thumbnailUrl: lesson.thumbnailUrl,
        videoUrl: access.hasAccess ? lesson.videoUrl : null,
        hasAccess: access.hasAccess,
        practiceName: practice?.name ?? null,
        categoryName: category?.name ?? null,
        unlockedAt: unlock.unlockedAt,
      };
    }),
  );

  const lessons = enrichedLessons.filter(Boolean) as NonNullable<
    (typeof enrichedLessons)[number]
  >[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="font-display text-2xl font-bold text-[var(--color-primary)]">
          Mis clases
        </h1>
        <Link
          href="/panel/on-demand"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          Ver catálogo
        </Link>
      </div>
      <p className="text-[var(--color-text-muted)] mb-6">
        Clases que has desbloqueado.
      </p>

      {lessons.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)] mb-3">
            No has desbloqueado ninguna clase aún.
          </p>
          <Link
            href="/panel/on-demand"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {lessons.map((lesson) => (
            <li
              key={lesson.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex gap-3 mb-3">
                {lesson.thumbnailUrl ? (
                  <img
                    src={lesson.thumbnailUrl}
                    alt={lesson.title}
                    className="h-16 w-24 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-16 w-24 flex-shrink-0 rounded bg-gray-100" />
                )}
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-semibold text-[var(--color-text)] truncate">
                    {lesson.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {[lesson.categoryName, lesson.practiceName]
                      .filter(Boolean)
                      .join(" · ")}
                    {lesson.durationMinutes && (
                      <span> · {lesson.durationMinutes} min</span>
                    )}
                  </p>
                  {!lesson.hasAccess && (
                    <p className="text-xs text-[var(--color-error)]">
                      Tu plan venció. Renuévalo para volver a ver esta clase.
                    </p>
                  )}
                </div>
              </div>

              {lesson.videoUrl && (
                <VimeoEmbed url={lesson.videoUrl} title={lesson.title} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
