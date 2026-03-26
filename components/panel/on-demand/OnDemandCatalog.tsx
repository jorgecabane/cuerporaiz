"use client";

import { useState } from "react";
import { LessonCard } from "./LessonCard";
import type { CategoryQuotaUsage } from "@/lib/application/get-category-quota-usage";

interface LessonData {
  id: string;
  title: string;
  durationMinutes: number | null;
  level: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  practiceId: string;
}

interface PracticeData {
  id: string;
  name: string;
  description: string | null;
  lessons: LessonData[];
}

interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  practices: PracticeData[];
}

interface OnDemandCatalogProps {
  categories: CategoryData[];
  unlockedLessonIds: string[];
  quotaUsage: CategoryQuotaUsage[];
}

export function OnDemandCatalog({
  categories,
  unlockedLessonIds: initialUnlocked,
  quotaUsage: initialQuota,
}: OnDemandCatalogProps) {
  const [unlockedIds, setUnlockedIds] = useState(new Set(initialUnlocked));
  const [quotaUsage, setQuotaUsage] = useState(initialQuota);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedPractices, setExpandedPractices] = useState<Set<string>>(new Set());

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePractice(id: string) {
    setExpandedPractices((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleUnlocked(lessonId: string, categoryId: string) {
    setUnlockedIds((prev) => new Set([...prev, lessonId]));
    setQuotaUsage((prev) =>
      prev.map((q) =>
        q.categoryId === categoryId
          ? { ...q, used: q.used + 1, remaining: Math.max(0, q.remaining - 1) }
          : q,
      ),
    );
  }

  function getRemaining(categoryId: string): number | null {
    const q = quotaUsage.find((q) => q.categoryId === categoryId);
    return q ? q.remaining : null;
  }

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const isExpanded = expandedCategories.has(cat.id);
        const remaining = getRemaining(cat.id);
        const totalLessons = cat.practices.reduce((acc, p) => acc + p.lessons.length, 0);

        return (
          <div
            key={cat.id}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <button
              onClick={() => toggleCategory(cat.id)}
              className="w-full flex items-center justify-between gap-4 p-4 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                {cat.thumbnailUrl && (
                  <img
                    src={cat.thumbnailUrl}
                    alt={cat.name}
                    className="h-12 w-12 flex-shrink-0 rounded object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-text)]">{cat.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {totalLessons} {totalLessons === 1 ? "clase" : "clases"}
                    {remaining !== null && (
                      <span className="ml-2">
                        · {remaining} disponible{remaining !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <span className="flex-shrink-0 text-[var(--color-text-muted)]">
                {isExpanded ? "▲" : "▼"}
              </span>
            </button>

            {isExpanded && (
              <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3 space-y-3">
                {cat.description && (
                  <p className="text-sm text-[var(--color-text-muted)]">{cat.description}</p>
                )}
                {cat.practices.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No hay prácticas disponibles.
                  </p>
                ) : (
                  cat.practices.map((practice) => {
                    const isPracticeExpanded = expandedPractices.has(practice.id);
                    return (
                      <div key={practice.id} className="rounded border border-[var(--color-border)]">
                        <button
                          onClick={() => togglePractice(practice.id)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left"
                        >
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text)]">
                              {practice.name}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {practice.lessons.length}{" "}
                              {practice.lessons.length === 1 ? "clase" : "clases"}
                            </p>
                          </div>
                          <span className="flex-shrink-0 text-xs text-[var(--color-text-muted)]">
                            {isPracticeExpanded ? "▲" : "▼"}
                          </span>
                        </button>

                        {isPracticeExpanded && (
                          <div className="border-t border-[var(--color-border)] p-3 space-y-2">
                            {practice.description && (
                              <p className="text-xs text-[var(--color-text-muted)] mb-2">
                                {practice.description}
                              </p>
                            )}
                            {practice.lessons.map((lesson) => (
                              <LessonCard
                                key={lesson.id}
                                lesson={lesson}
                                categoryName={cat.name}
                                unlocked={unlockedIds.has(lesson.id)}
                                remaining={remaining}
                                onUnlocked={() => handleUnlocked(lesson.id, cat.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
