"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { QuotaChips } from "./QuotaChips";
import { PracticeCard } from "./PracticeCard";
import { ReplayLessonCard } from "./ReplayLessonCard";
import { ReplayPlayer } from "./ReplayPlayer";
import type { CategoryQuotaUsage } from "@/lib/application/get-category-quota-usage";

interface LessonData {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  level: string | null;
  intensity: string | null;
  targetAudience: string | null;
  equipment: string | null;
  tags: string | null;
  thumbnailUrl: string | null;
  promoVideoUrl: string | null;
  videoUrl: string | null;
  practiceId: string;
}

interface PracticeData {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  lessons: LessonData[];
}

interface CategoryData {
  id: string;
  name: string;
  practices: PracticeData[];
}

interface ReplayShellProps {
  categories: CategoryData[];
  unlockedLessonIds: string[];
  quotaUsage: CategoryQuotaUsage[];
  unlimited: boolean;
}

export function ReplayShell({
  categories,
  unlockedLessonIds: initialUnlocked,
  quotaUsage: initialQuota,
  unlimited,
}: ReplayShellProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [unlockedIds, setUnlockedIds] = useState(new Set(initialUnlocked));
  const [quotaUsage, setQuotaUsage] = useState(initialQuota);

  const practiceId = searchParams.get("practice");
  const lessonId = searchParams.get("lesson");

  // Lookup helpers
  const allPractices = categories.flatMap((c) =>
    c.practices.map((p) => ({ ...p, categoryName: c.name })),
  );
  const allLessons = allPractices.flatMap((p) =>
    p.lessons.map((l) => ({ ...l, practiceName: p.name, categoryId: p.categoryId, categoryName: p.categoryName })),
  );

  const categoryNames: Record<string, string> = {};
  for (const c of categories) categoryNames[c.id] = c.name;

  const navigate = useCallback(
    (params: Record<string, string | null>) => {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v) sp.set(k, v);
      }
      const query = sp.toString();
      router.push(`/panel/replay${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router],
  );

  function handleUnlocked(lessonIdUnlocked: string, categoryId: string) {
    setUnlockedIds((prev) => new Set([...prev, lessonIdUnlocked]));
    if (!unlimited) {
      setQuotaUsage((prev) =>
        prev.map((q) =>
          q.categoryId === categoryId
            ? { ...q, used: q.used + 1, remaining: Math.max(0, q.remaining - 1) }
            : q,
        ),
      );
    }
  }

  function getRemaining(categoryId: string): number | null {
    if (unlimited) return null;
    const q = quotaUsage.find((qu) => qu.categoryId === categoryId);
    return q ? q.remaining : null;
  }

  // ─── VIEW 3: Player ────────────────────────────────────────────────────────
  if (lessonId) {
    const lesson = allLessons.find((l) => l.id === lessonId);
    if (!lesson) return <p className="text-[var(--color-text-muted)]">Clase no encontrada.</p>;

    const practice = allPractices.find((p) => p.id === lesson.practiceId);
    if (!practice) return <p className="text-[var(--color-text-muted)]">Práctica no encontrada.</p>;

    const isUnlocked = unlockedIds.has(lesson.id);

    // If not unlocked, redirect to practice view
    if (!isUnlocked || !lesson.videoUrl) {
      navigate({ practice: practice.id });
      return null;
    }

    const siblings = practice.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      durationMinutes: l.durationMinutes,
      intensity: l.intensity,
      thumbnailUrl: l.thumbnailUrl,
      unlocked: unlockedIds.has(l.id),
    }));

    return (
      <div className="max-w-3xl mx-auto">
        <ReplayPlayer
          lesson={{
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            videoUrl: lesson.videoUrl,
            promoVideoUrl: lesson.promoVideoUrl,
            durationMinutes: lesson.durationMinutes,
            level: lesson.level,
            intensity: lesson.intensity,
            targetAudience: lesson.targetAudience,
            equipment: lesson.equipment,
            tags: lesson.tags,
          }}
          practiceName={practice.name}
          siblings={siblings}
          onBack={() => navigate({ practice: practice.id })}
          onNavigate={(id) => {
            if (unlockedIds.has(id)) {
              navigate({ lesson: id });
            } else {
              navigate({ practice: practice.id });
            }
          }}
        />
      </div>
    );
  }

  // ─── VIEW 2: Practice lessons ──────────────────────────────────────────────
  if (practiceId) {
    const practice = allPractices.find((p) => p.id === practiceId);
    if (!practice) return <p className="text-[var(--color-text-muted)]">Práctica no encontrada.</p>;

    const remaining = getRemaining(practice.categoryId);

    return (
      <div className="max-w-2xl mx-auto">
        {/* Sticky back bar */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border)]">
          <button
            onClick={() => navigate({})}
            className="text-base text-[var(--color-text)] hover:text-[var(--color-primary)]"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[var(--color-text)]">{practice.name}</h1>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)]">
              {practice.categoryName}
              {remaining !== null && ` · ${remaining} disponible${remaining !== 1 ? "s" : ""} para canjear`}
              {unlimited && " · Acceso ilimitado"}
            </p>
          </div>
        </div>

        {practice.description && (
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-4">{practice.description}</p>
        )}

        <div className="flex flex-col gap-2">
          {practice.lessons.map((lesson) => (
            <ReplayLessonCard
              key={lesson.id}
              lesson={lesson}
              categoryName={practice.categoryName}
              unlocked={unlockedIds.has(lesson.id)}
              remaining={remaining}
              onUnlocked={() => handleUnlocked(lesson.id, practice.categoryId)}
              onPlay={(id) => navigate({ lesson: id })}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── VIEW 1: Grid ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">Replay</h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
          Clases grabadas para practicar cuando quieras
        </p>
      </div>

      <div className="mb-5">
        <QuotaChips
          quotaUsage={quotaUsage}
          categoryNames={categoryNames}
          unlimited={unlimited}
        />
      </div>

      {categories.map((cat) => (
        <div key={cat.id} className="mb-6">
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-base sm:text-lg font-bold text-[var(--color-text)]">{cat.name}</h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              {cat.practices.reduce((a, p) => a + p.lessons.length, 0)} clases · {cat.practices.length} prácticas
            </span>
          </div>

          {/* Desktop: 3-col grid, Mobile: stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cat.practices.map((practice) => {
              const unlockedCount = practice.lessons.filter((l) => unlockedIds.has(l.id)).length;
              return (
                <PracticeCard
                  key={practice.id}
                  id={practice.id}
                  name={practice.name}
                  lessonCount={practice.lessons.length}
                  unlockedCount={unlockedCount}
                  thumbnailUrl={null}
                  onClick={(id) => navigate({ practice: id })}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
