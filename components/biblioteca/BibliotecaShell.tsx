"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { QuotaChips } from "./QuotaChips";
import { PracticeCard } from "./PracticeCard";
import { LessonCard } from "./LessonCard";
import { Player } from "./Player";
import type { BibliotecaMode, RoutingMode, CategoryData, NavigationTarget } from "./types";
import { buildBibliotecaHref } from "./types";

interface BibliotecaShellProps {
  categories: CategoryData[];
  mode: BibliotecaMode;
  /**
   * `path`: usado por las pages /catalogo/*. El shell recibe la selección via props
   * (selectedPracticeId, selectedCategoryId) que vienen del segmento dinámico de la URL.
   * `query`: usado por /panel/replay. El shell lee la selección de searchParams.
   */
  routingMode: RoutingMode;
  /** Base path: `/catalogo` (path mode) o `/panel/replay` (query mode). */
  basePath: string;
  selectedCategoryId?: string | null;
  selectedPracticeId?: string | null;
  selectedLessonId?: string | null;
  title?: string;
  subtitle?: string;
}

export function BibliotecaShell({
  categories,
  mode,
  routingMode,
  basePath,
  selectedCategoryId: propCategoryId = null,
  selectedPracticeId: propPracticeId = null,
  selectedLessonId: propLessonId = null,
  title = "Biblioteca virtual",
  subtitle,
}: BibliotecaShellProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const buildHref = (target: NavigationTarget) =>
    buildBibliotecaHref(basePath, routingMode, target);

  const [unlockedIds, setUnlockedIds] = useState(
    mode.kind === "authenticated" ? new Set(mode.unlockedLessonIds) : new Set<string>()
  );
  const [quotaUsage, setQuotaUsage] = useState(
    mode.kind === "authenticated" ? mode.quotaUsage : []
  );

  const selectedPracticeId =
    routingMode === "query" ? searchParams.get("practice") : propPracticeId;
  const selectedLessonId =
    routingMode === "query" ? searchParams.get("lesson") : propLessonId;
  const selectedCategoryId =
    routingMode === "query" ? searchParams.get("category") : propCategoryId;

  const allPractices = categories.flatMap((c) =>
    c.practices.map((p) => ({ ...p, categoryName: c.name }))
  );
  const allLessons = allPractices.flatMap((p) =>
    p.lessons.map((l) => ({
      ...l,
      practiceName: p.name,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
    }))
  );

  const categoryNames: Record<string, string> = {};
  for (const c of categories) categoryNames[c.id] = c.name;

  function getRemaining(categoryId: string): number | null {
    if (mode.kind !== "authenticated") return null;
    if (mode.unlimited) return null;
    const q = quotaUsage.find((qu) => qu.categoryId === categoryId);
    return q ? q.remaining : null;
  }

  function handleUnlocked(lessonId: string, categoryId: string) {
    if (mode.kind !== "authenticated") return;
    setUnlockedIds((prev) => new Set([...prev, lessonId]));
    if (!mode.unlimited) {
      setQuotaUsage((prev) =>
        prev.map((q) =>
          q.categoryId === categoryId
            ? { ...q, used: q.used + 1, remaining: Math.max(0, q.remaining - 1) }
            : q
        )
      );
    }
    router.refresh();
  }

  /**
   * En modo public, el CTA va a /auth/login con un callbackUrl que apunta al
   * deep-link equivalente en /panel/replay. Así el usuario, una vez logueado,
   * cae directo en la práctica/lección que estaba viendo —sin perder el contexto.
   * El middleware respeta callbackUrl si la sesión ya estaba activa.
   */
  function buildPublicCtaHref(target: NavigationTarget): string {
    const replayHref = buildBibliotecaHref("/panel/replay", "query", target);
    return `/auth/login?callbackUrl=${encodeURIComponent(replayHref)}`;
  }

  const rootLabel = routingMode === "path" ? "Catálogo" : "Biblioteca virtual";

  // Renderiza chips de quota cuando aplica (siempre que estemos en modo authenticated).
  // Se incluye en vistas 1 y 2 para no perder el contexto de canjes disponibles.
  const compactQuota =
    mode.kind === "authenticated" ? (
      <div className="mb-4">
        <QuotaChips
          quotaUsage={quotaUsage}
          categoryNames={categoryNames}
          unlimited={mode.unlimited}
        />
      </div>
    ) : null;

  // Si llegó al shell con selectedLessonId y es authenticated CON la lesson canjeada
  // (+ videoUrl), va a Player. Si no está canjeada, caemos a vista 2 con esa lesson
  // pre-expandida (deep-link de "vine del catálogo público a esta clase específica").
  const focusedLesson = selectedLessonId
    ? allLessons.find((l) => l.id === selectedLessonId)
    : null;
  const showPlayer =
    !!selectedLessonId &&
    mode.kind === "authenticated" &&
    !!focusedLesson &&
    unlockedIds.has(selectedLessonId) &&
    !!focusedLesson.videoUrl;

  // ─── VIEW 3: Player (solo authenticated y lesson canjeada) ────────────────
  if (showPlayer && focusedLesson) {
    const lesson = focusedLesson;
    const practice = allPractices.find((p) => p.id === lesson.practiceId);
    if (!practice) {
      return <p className="text-[var(--color-text-muted)]">Práctica no encontrada.</p>;
    }
    // Type guard: showPlayer ya garantiza videoUrl no-null.
    if (!lesson.videoUrl) return null;
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
        <Player
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
          onBack={() =>
            router.push(buildHref({ category: practice.categoryId, practice: practice.id }))
          }
          onNavigate={(id) => {
            if (unlockedIds.has(id)) {
              router.push(buildHref({ lesson: id }));
            } else {
              router.push(buildHref({ category: practice.categoryId, practice: practice.id }));
            }
          }}
        />
      </div>
    );
  }

  // ─── VIEW 2: Lecciones de una práctica ────────────────────────────────────
  // Si vino directo a una lesson (deep-link desde catálogo público) sin practiceId,
  // derivamos el practiceId desde la lesson para resolver la vista 2 + abrir el card.
  const effectivePracticeId =
    selectedPracticeId ?? (focusedLesson ? focusedLesson.practiceId : null);
  if (effectivePracticeId) {
    const practice = allPractices.find((p) => p.id === effectivePracticeId);
    if (!practice) {
      return <p className="text-[var(--color-text-muted)]">Práctica no encontrada.</p>;
    }
    const remaining = getRemaining(practice.categoryId);
    const practiceHref = buildHref({ category: practice.categoryId, practice: practice.id });
    return (
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-3 flex flex-wrap items-center gap-1">
          <Link href={buildHref({})} className="hover:text-[var(--color-text)]">
            {rootLabel}
          </Link>
          <span aria-hidden="true" className="opacity-60">/</span>
          <Link
            href={buildHref({ category: practice.categoryId })}
            className="hover:text-[var(--color-text)]"
          >
            {practice.categoryName}
          </Link>
          <span aria-hidden="true" className="opacity-60">/</span>
          <span className="text-[var(--color-text)]">{practice.name}</span>
        </nav>

        {/* Quota chips siempre visibles para mantener contexto de canjes */}
        {compactQuota}

        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-border)]">
          <Link
            href={buildHref({ category: practice.categoryId })}
            className="text-base text-[var(--color-text)] hover:text-[var(--color-primary)]"
            aria-label="Volver"
          >
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[var(--color-text)]">
              {practice.name}
            </h1>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)]">
              {practice.categoryName}
              {remaining !== null &&
                ` · ${remaining} disponible${remaining !== 1 ? "s" : ""} para canjear`}
              {mode.kind === "authenticated" && mode.unlimited && " · Acceso ilimitado"}
            </p>
          </div>
        </div>

        {practice.description && (
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-4">
            {practice.description}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {practice.lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              categoryName={practice.categoryName}
              mode={mode}
              unlocked={unlockedIds.has(lesson.id)}
              remaining={remaining}
              onUnlocked={() => handleUnlocked(lesson.id, practice.categoryId)}
              onPlay={(id) => router.push(buildHref({ lesson: id }))}
              defaultExpanded={lesson.id === selectedLessonId}
              loginHref={
                mode.kind === "public"
                  ? buildPublicCtaHref({
                      category: practice.categoryId,
                      practice: practice.id,
                      lesson: lesson.id,
                    })
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── VIEW 1: Grid de categorías ───────────────────────────────────────────
  const gridHref = buildHref({});
  const selectedCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)
    : null;
  // Si hay categoría seleccionada, mostramos solo esa (en query mode el wrapper
  // mandó todas; en path mode el wrapper ya filtró, este filter es no-op).
  const visibleCategories = selectedCategory ? [selectedCategory] : categories;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb cuando hay categoría seleccionada */}
      {selectedCategory && (
        <nav className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-3 flex flex-wrap items-center gap-1">
          <Link href={buildHref({})} className="hover:text-[var(--color-text)]">
            {rootLabel}
          </Link>
          <span aria-hidden="true" className="opacity-60">/</span>
          <span className="text-[var(--color-text)]">{selectedCategory.name}</span>
        </nav>
      )}

      {/* Hero banner cuando la categoría seleccionada tiene thumbnail */}
      {selectedCategory?.thumbnailUrl ? (
        <div className="relative overflow-hidden rounded-[var(--radius-2xl)] aspect-[16/6] mb-6 shadow-[var(--shadow-md)]">
          <img
            src={selectedCategory.thumbnailUrl}
            alt={selectedCategory.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(45,59,42,0.85) 0%, rgba(45,59,42,0.25) 50%, transparent 100%)",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 p-[var(--space-6)] text-white">
            <h1 className="font-display font-semibold text-3xl md:text-4xl">
              {selectedCategory.name}
            </h1>
            {selectedCategory.description && (
              <p className="mt-2 max-w-xl text-sm text-white/85">
                {selectedCategory.description}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">
            {selectedCategory ? selectedCategory.name : title}
          </h1>
          {!selectedCategory && subtitle && (
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">{subtitle}</p>
          )}
          {selectedCategory?.description && (
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
              {selectedCategory.description}
            </p>
          )}
        </div>
      )}

      {compactQuota}

      {visibleCategories.map((cat) => (
        <div key={cat.id} className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-3 min-w-0">
              {cat.thumbnailUrl && !selectedCategory && (
                <img
                  src={cat.thumbnailUrl}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex flex-wrap items-baseline gap-x-2">
                <h2 className="text-base sm:text-lg font-bold text-[var(--color-text)]">
                  {cat.name}
                </h2>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {cat.practices.reduce((a, p) => a + p.lessons.length, 0)} clases ·{" "}
                  {cat.practices.length} prácticas
                </span>
              </div>
            </div>
            {!selectedCategory && (
              <Link
                href={buildHref({ category: cat.id })}
                className="text-xs sm:text-sm font-medium text-[var(--color-secondary)] hover:underline flex-shrink-0"
              >
                Ver todo →
              </Link>
            )}
          </div>
          {cat.description && !selectedCategory && (
            <p className="text-xs text-[var(--color-text-muted)] -mt-1 mb-3">
              {cat.description}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cat.practices.map((practice) => {
              const unlockedCount = practice.lessons.filter((l) => unlockedIds.has(l.id)).length;
              return (
                <PracticeCard
                  key={practice.id}
                  id={practice.id}
                  name={practice.name}
                  description={practice.description}
                  lessonCount={practice.lessons.length}
                  unlockedCount={unlockedCount}
                  thumbnailUrl={practice.thumbnailUrl}
                  showProgress={mode.kind === "authenticated"}
                  onClick={(id) =>
                    router.push(buildHref({ category: cat.id, practice: id }))
                  }
                />
              );
            })}
          </div>
        </div>
      ))}

      {mode.kind === "public" && visibleCategories.length > 0 && (
        <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white p-6 text-center">
          <p className="text-sm sm:text-base mb-3">
            <strong>¿Te interesa una práctica?</strong> Inicia sesión o crea tu cuenta gratis para canjear clases.
          </p>
          <Link
            href={buildPublicCtaHref(
              selectedCategory ? { category: selectedCategory.id } : {}
            )}
            className="inline-block rounded-[var(--radius-md)] bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-secondary-hover)]"
          >
            Iniciar sesión o crear cuenta →
          </Link>
        </div>
      )}
    </div>
  );
}
