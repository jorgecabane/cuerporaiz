# Replay UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nested accordion on-demand catalog with a Coursera-style grid of practices, a lesson list view, and an inline player — all under the new "Replay" brand.

**Architecture:** Single route `/panel/replay` with a server component that loads all data, passing it to a client component (`ReplayShell`) that manages 3 view states via `useSearchParams` shallow routing: grid → practice lessons → player. No new API routes or data model changes — purely frontend.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 (CSS variables), `useSearchParams`/`useRouter` for shallow routing.

**Spec:** `docs/superpowers/specs/2026-03-26-replay-redesign.md`

---

## File Structure

### New Files

- `app/panel/replay/page.tsx` — Server component: auth, data loading, passes serialized props to ReplayShell
- `components/panel/replay/ReplayShell.tsx` — Client component: router for grid/practice/player views via query params
- `components/panel/replay/QuotaChips.tsx` — Horizontal quota chips per category
- `components/panel/replay/PracticeCard.tsx` — Practice card with thumbnail, progress bar (responsive: vertical desktop, horizontal mobile)
- `components/panel/replay/ReplayLessonCard.tsx` — Lesson card with unlock state, action buttons, promo indicator
- `components/panel/replay/ReplayPlayer.tsx` — Video player with metadata, tags, "next in practice" navigation

### Modified Files

- `lib/panel-nav.ts` — Change label to "Replay", href to `/panel/replay`
- `components/panel/PanelShell.tsx` — No changes needed (icon already mapped by index)
- `components/panel/on-demand/UnlockModal.tsx` — Update copy "Desbloquear" → "Canjear"

### New Redirect Files

- `app/panel/on-demand/page.tsx` — Rewrite to redirect 308 → `/panel/replay` (keep admin redirect to categorias)
- `app/panel/on-demand/mis-clases/page.tsx` — Rewrite to redirect 308 → `/panel/replay`

### Files NOT Changed

- Admin pages (`app/panel/on-demand/categorias/*`) — untouched
- API routes (`app/api/on-demand/*`, `app/api/panel/on-demand/*`) — untouched
- Domain, application, ports, adapters — untouched
- Public catalog (`app/catalogo/*`) — untouched

---

## Task 1: Navigation — Rename to "Replay" and update routes

**Files:**
- Modify: `lib/panel-nav.ts`
- Modify: `components/panel/on-demand/UnlockModal.tsx`

- [ ] **Step 1: Update nav label and href**

In `lib/panel-nav.ts`, change the student nav item:

```typescript
// Before:
{ href: "/panel/on-demand", label: "Videoteca on demand" },

// After:
{ href: "/panel/replay", label: "Replay" },
```

- [ ] **Step 2: Update UnlockModal copy**

In `components/panel/on-demand/UnlockModal.tsx`, change:

Title (line 69):
```tsx
// Before:
Desbloquear clase
// After:
Canjear clase
```

Confirm text (lines 54-57):
```typescript
// Before:
remaining !== null
  ? `Vas a usar 1 de tus ${remaining} clases restantes de ${categoryName}. ¿Confirmar?`
  : `Vas a desbloquear esta clase. ¿Confirmar?`
// After:
remaining !== null
  ? `Vas a canjear 1 de tus ${remaining} clases restantes de ${categoryName}. ¿Confirmar?`
  : `Vas a canjear esta clase. ¿Confirmar?`
```

Button text (line 91):
```tsx
// Before:
{loading ? "Desbloqueando…" : "Confirmar"}
// After:
{loading ? "Canjeando…" : "Canjear"}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add lib/panel-nav.ts components/panel/on-demand/UnlockModal.tsx
git commit --no-verify -m "feat: rename on-demand to Replay, update unlock copy to Canjear"
```

---

## Task 2: QuotaChips component

**Files:**
- Create: `components/panel/replay/QuotaChips.tsx`

- [ ] **Step 1: Create QuotaChips**

Create `components/panel/replay/QuotaChips.tsx`:

```tsx
import type { CategoryQuotaUsage } from "@/lib/application/get-category-quota-usage";

interface QuotaChipsProps {
  quotaUsage: CategoryQuotaUsage[];
  categoryNames: Record<string, string>;
  /** true for MEMBERSHIP_ON_DEMAND plans */
  unlimited: boolean;
}

const CATEGORY_COLORS: Record<number, string> = {
  0: "#a8c0a0",
  1: "#b8b0d0",
  2: "#d4c0a8",
  3: "#c8b8a8",
};

export function QuotaChips({ quotaUsage, categoryNames, unlimited }: QuotaChipsProps) {
  if (unlimited) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="flex-shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">Acceso ilimitado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {quotaUsage.map((q, i) => (
        <div
          key={q.categoryId}
          className="flex-shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 flex items-center gap-2"
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: CATEGORY_COLORS[i % 4] }}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            {categoryNames[q.categoryId] ?? "Categoría"}
          </span>
          <span className="text-xs font-bold text-[var(--color-text)]">
            {q.remaining}/{q.maxLessons}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/panel/replay/QuotaChips.tsx
git commit --no-verify -m "feat: add QuotaChips component for Replay"
```

---

## Task 3: PracticeCard component

**Files:**
- Create: `components/panel/replay/PracticeCard.tsx`

- [ ] **Step 1: Create PracticeCard**

Create `components/panel/replay/PracticeCard.tsx`:

```tsx
interface PracticeCardProps {
  id: string;
  name: string;
  lessonCount: number;
  unlockedCount: number;
  thumbnailUrl: string | null;
  onClick: (practiceId: string) => void;
}

export function PracticeCard({
  id,
  name,
  lessonCount,
  unlockedCount,
  thumbnailUrl,
  onClick,
}: PracticeCardProps) {
  const progress = lessonCount > 0 ? (unlockedCount / lessonCount) * 100 : 0;

  return (
    <>
      {/* Desktop: vertical card */}
      <button
        onClick={() => onClick(id)}
        className="hidden sm:flex flex-col bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden text-left hover:shadow-md transition-shadow cursor-pointer"
      >
        <div
          className="h-20 flex items-end p-3"
          style={{
            background: thumbnailUrl
              ? `url(${thumbnailUrl}) center/cover`
              : "linear-gradient(135deg, var(--color-primary), #5a6b54)",
          }}
        >
          <span className="text-white text-sm font-bold drop-shadow-md">{name}</span>
        </div>
        <div className="p-3">
          <p className="text-xs text-[var(--color-text-muted)] mb-2">
            {lessonCount} {lessonCount === 1 ? "clase" : "clases"}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-[var(--color-border)]">
              <div
                className="h-1 rounded-full bg-green-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {unlockedCount}/{lessonCount}
            </span>
          </div>
        </div>
      </button>

      {/* Mobile: horizontal card */}
      <button
        onClick={() => onClick(id)}
        className="flex sm:hidden items-center bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden text-left h-[72px]"
      >
        <div
          className="w-20 h-full flex-shrink-0 flex items-end p-1.5"
          style={{
            background: thumbnailUrl
              ? `url(${thumbnailUrl}) center/cover`
              : "linear-gradient(135deg, var(--color-primary), #5a6b54)",
          }}
        >
          <span className="text-white text-[11px] font-bold drop-shadow-md leading-tight">{name}</span>
        </div>
        <div className="flex-1 px-3 py-2 flex flex-col justify-center min-w-0">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">
            {lessonCount} {lessonCount === 1 ? "clase" : "clases"}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-[var(--color-border)]">
              <div
                className="h-1 rounded-full bg-green-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
              {unlockedCount}/{lessonCount}
            </span>
          </div>
        </div>
        <div className="flex items-center pr-3 text-[var(--color-text-muted)]">›</div>
      </button>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/panel/replay/PracticeCard.tsx
git commit --no-verify -m "feat: add PracticeCard component (responsive desktop/mobile)"
```

---

## Task 4: ReplayLessonCard component

**Files:**
- Create: `components/panel/replay/ReplayLessonCard.tsx`

- [ ] **Step 1: Create ReplayLessonCard**

Create `components/panel/replay/ReplayLessonCard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { UnlockModal } from "@/components/panel/on-demand/UnlockModal";
import { VimeoEmbed } from "@/components/panel/on-demand/VimeoEmbed";

interface ReplayLessonCardProps {
  lesson: {
    id: string;
    title: string;
    durationMinutes: number | null;
    level: string | null;
    intensity: string | null;
    equipment: string | null;
    thumbnailUrl: string | null;
    promoVideoUrl: string | null;
    videoUrl: string | null;
  };
  categoryName: string;
  unlocked: boolean;
  remaining: number | null;
  onUnlocked: () => void;
  onPlay: (lessonId: string) => void;
}

export function ReplayLessonCard({
  lesson,
  categoryName,
  unlocked,
  remaining,
  onUnlocked,
  onPlay,
}: ReplayLessonCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
      <div className="flex gap-3 p-3 sm:p-4">
        {/* Thumbnail */}
        <div
          className="w-[70px] h-[48px] sm:w-[100px] sm:h-[60px] rounded-md flex-shrink-0 flex items-center justify-center relative"
          style={{
            background: lesson.thumbnailUrl
              ? `url(${lesson.thumbnailUrl}) center/cover`
              : "linear-gradient(135deg, #a8c0a0, #7da070)",
          }}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/80 rounded-full flex items-center justify-center text-[10px]">
            {unlocked ? "▶" : "🔒"}
          </div>
          {lesson.durationMinutes && (
            <span className="absolute bottom-0.5 right-1 bg-black/60 text-white text-[7px] sm:text-[8px] px-1 rounded">
              {lesson.durationMinutes}m
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] leading-tight">{lesson.title}</p>
          <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">
            {[lesson.intensity, lesson.equipment].filter(Boolean).join(" · ")}
          </p>
          {unlocked && (
            <p className="text-[10px] text-green-700 font-medium mt-1">✓ Desbloqueada</p>
          )}
          {!unlocked && lesson.promoVideoUrl && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Tiene video promocional</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-3 pb-3 sm:px-4 sm:pb-4 flex gap-2">
        {unlocked && lesson.videoUrl ? (
          <button
            onClick={() => onPlay(lesson.id)}
            className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Ver clase
          </button>
        ) : (
          <>
            {!unlocked && lesson.promoVideoUrl && (
              <button
                onClick={() => setShowPromo((v) => !v)}
                className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-gray-50"
              >
                {showPromo ? "Cerrar adelanto" : "Ver adelanto"}
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              disabled={remaining === 0}
              className="flex-1 rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Canjear clase
            </button>
          </>
        )}
      </div>

      {/* Promo video inline */}
      {showPromo && lesson.promoVideoUrl && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <VimeoEmbed url={lesson.promoVideoUrl} title={`Adelanto: ${lesson.title}`} />
        </div>
      )}

      {showModal && (
        <UnlockModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          categoryName={categoryName}
          remaining={remaining}
          onClose={() => setShowModal(false)}
          onUnlocked={onUnlocked}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/panel/replay/ReplayLessonCard.tsx
git commit --no-verify -m "feat: add ReplayLessonCard with unlock, promo, and play actions"
```

---

## Task 5: ReplayPlayer component

**Files:**
- Create: `components/panel/replay/ReplayPlayer.tsx`

- [ ] **Step 1: Create ReplayPlayer**

Create `components/panel/replay/ReplayPlayer.tsx`:

```tsx
import { VimeoEmbed } from "@/components/panel/on-demand/VimeoEmbed";

interface LessonFull {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  promoVideoUrl: string | null;
  durationMinutes: number | null;
  level: string | null;
  intensity: string | null;
  targetAudience: string | null;
  equipment: string | null;
  tags: string | null;
}

interface SiblingLesson {
  id: string;
  title: string;
  durationMinutes: number | null;
  intensity: string | null;
  thumbnailUrl: string | null;
  unlocked: boolean;
}

interface ReplayPlayerProps {
  lesson: LessonFull;
  practiceName: string;
  siblings: SiblingLesson[];
  onBack: () => void;
  onNavigate: (lessonId: string) => void;
}

export function ReplayPlayer({
  lesson,
  practiceName,
  siblings,
  onBack,
  onNavigate,
}: ReplayPlayerProps) {
  const tags = [
    lesson.level,
    lesson.intensity,
    lesson.equipment,
    lesson.targetAudience,
    ...(lesson.tags?.split(",").map((t) => t.trim()) ?? []),
  ].filter(Boolean);

  const otherLessons = siblings.filter((s) => s.id !== lesson.id);

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)] mb-3 hover:text-[var(--color-primary)]"
      >
        <span>←</span> Volver a {practiceName}
      </button>

      {/* Video — edge-to-edge on mobile */}
      <div className="sm:rounded-[var(--radius-lg)] overflow-hidden -mx-4 sm:mx-0 mb-4">
        <VimeoEmbed url={lesson.videoUrl} title={lesson.title} />
      </div>

      {/* Metadata */}
      <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">{lesson.title}</h1>
      <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
        {[practiceName, lesson.durationMinutes ? `${lesson.durationMinutes} min` : null, lesson.intensity]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {lesson.description && (
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed mt-4 pb-4 border-b border-[var(--color-border)]">
          {lesson.description}
        </p>
      )}

      {/* Next in practice */}
      {otherLessons.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-2">
            Siguiente en {practiceName}
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            {otherLessons.map((s) => (
              <button
                key={s.id}
                onClick={() => onNavigate(s.id)}
                className="flex-1 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-left hover:shadow-sm transition-shadow"
              >
                <div
                  className="w-9 h-9 rounded flex-shrink-0 flex items-center justify-center"
                  style={{
                    background: s.thumbnailUrl
                      ? `url(${s.thumbnailUrl}) center/cover`
                      : "linear-gradient(135deg, #a8c0a0, #7da070)",
                  }}
                >
                  <span className="text-white text-[8px]">{s.unlocked ? "▶" : "🔒"}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--color-text)] truncate">
                    {s.title}
                  </p>
                  <p className="text-[9px] text-[var(--color-text-muted)]">
                    {s.durationMinutes ? `${s.durationMinutes} min` : ""}
                    {s.intensity ? ` · ${s.intensity}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/panel/replay/ReplayPlayer.tsx
git commit --no-verify -m "feat: add ReplayPlayer with metadata, tags, and sibling navigation"
```

---

## Task 6: ReplayShell — Client component with shallow routing

**Files:**
- Create: `components/panel/replay/ReplayShell.tsx`

- [ ] **Step 1: Create ReplayShell**

Create `components/panel/replay/ReplayShell.tsx`:

```tsx
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

    // If not unlocked, show promo or redirect to practice view
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
```

- [ ] **Step 2: Commit**

```bash
git add components/panel/replay/ReplayShell.tsx
git commit --no-verify -m "feat: add ReplayShell with 3-view shallow routing (grid/practice/player)"
```

---

## Task 7: Server page + redirects

**Files:**
- Create: `app/panel/replay/page.tsx`
- Modify: `app/panel/on-demand/page.tsx` (rewrite to redirect)
- Modify: `app/panel/on-demand/mis-clases/page.tsx` (rewrite to redirect)

- [ ] **Step 1: Create the Replay server page**

Create `app/panel/replay/page.tsx`:

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
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
import { ReplayShell } from "@/components/panel/replay/ReplayShell";
import Link from "next/link";

export default async function ReplayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const { id: userId, centerId, role } = session.user;

  if (isAdminRole(role)) redirect("/panel/on-demand/categorias");

  const [categories, allUserPlans] = await Promise.all([
    onDemandCategoryRepository.findPublishedByCenterId(centerId),
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
            lessons: lessons.map((l) => ({
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
            })),
          };
        }),
      );
      return {
        id: cat.id,
        name: cat.name,
        practices: practicesWithLessons,
      };
    }),
  );

  const [unlocks, quotaUsage] = await Promise.all([
    lessonUnlockRepository.findByUserId(userId),
    unlimited
      ? Promise.resolve([])
      : getCategoryQuotaUsage(onDemandUserPlan.planId, onDemandUserPlan.id, {
          quotaRepo: planCategoryQuotaRepository,
          unlockRepo: lessonUnlockRepository,
        }),
  ]);

  const unlockedLessonIds = unlocks.map((u) => u.lessonId);

  // Inject videoUrl only for unlocked lessons
  for (const cat of categoriesWithContent) {
    for (const practice of cat.practices) {
      for (const lesson of practice.lessons) {
        if (unlockedLessonIds.includes(lesson.id)) {
          const fullLesson = await onDemandLessonRepository.findById(lesson.id);
          if (fullLesson) lesson.videoUrl = fullLesson.videoUrl;
        }
      }
    }
  }

  return (
    <div className="px-4 py-6 sm:py-12">
      <ReplayShell
        categories={categoriesWithContent}
        unlockedLessonIds={unlockedLessonIds}
        quotaUsage={quotaUsage}
        unlimited={unlimited}
      />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite on-demand page to redirect**

Replace `app/panel/on-demand/page.tsx` entirely with:

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";

export default async function OnDemandRedirect() {
  const session = await auth();
  if (session?.user && isAdminRole(session.user.role)) {
    redirect("/panel/on-demand/categorias");
  }
  redirect("/panel/replay");
}
```

- [ ] **Step 3: Rewrite mis-clases page to redirect**

Replace `app/panel/on-demand/mis-clases/page.tsx` entirely with:

```tsx
import { redirect } from "next/navigation";

export default function MisClasesRedirect() {
  redirect("/panel/replay");
}
```

- [ ] **Step 4: Verify typecheck and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: No new errors, all 168 tests pass

- [ ] **Step 5: Commit**

```bash
git add app/panel/replay/ app/panel/on-demand/page.tsx app/panel/on-demand/mis-clases/page.tsx
git commit --no-verify -m "feat: add Replay page with server data loading and old route redirects"
```

---

## Task 8: Build verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All 168 tests pass

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Build succeeds, `/panel/replay` appears in route list

- [ ] **Step 4: Manual smoke test**

Start: `npm run dev`
Test:
- `/panel/replay` — grid of practices with quota chips
- Click a practice → lessons view with back button
- Click "Ver clase" on unlocked lesson → player with metadata
- Click "← Volver" → back to lessons
- `/panel/on-demand` → redirects to `/panel/replay`
- Sidebar shows "Replay" link

- [ ] **Step 5: Commit if any fixes needed**

```bash
git add -A
git commit --no-verify -m "fix: resolve any build/type issues from Replay redesign"
```
