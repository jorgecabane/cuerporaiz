"use client";

import { useState } from "react";
import { UnlockModal } from "@/components/panel/on-demand/UnlockModal";
import { VimeoEmbed } from "@/components/panel/on-demand/VimeoEmbed";

interface ReplayLessonCardProps {
  lesson: {
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
  const [expanded, setExpanded] = useState(false);

  const tags = [
    lesson.level,
    lesson.intensity,
    lesson.targetAudience,
    ...(lesson.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? []),
  ].filter(Boolean);

  const hasDetail = lesson.description ?? lesson.promoVideoUrl ?? lesson.thumbnailUrl ?? tags.length > 0;

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden transition-shadow hover:shadow-sm">
      {/* Collapsed row */}
      <div className="flex gap-3 p-3 sm:p-4">
        {/* Thumbnail */}
        <button
          onClick={() => hasDetail && setExpanded((v) => !v)}
          className="w-[70px] h-[48px] sm:w-[100px] sm:h-[60px] rounded-lg flex-shrink-0 flex items-center justify-center relative cursor-pointer"
          style={{
            background: lesson.thumbnailUrl
              ? `url(${lesson.thumbnailUrl}) center/cover`
              : "linear-gradient(135deg, #a8c0a0, #7da070)",
          }}
        >
          <div className="w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-[10px]">
            {unlocked ? "▶" : "🔒"}
          </div>
          {lesson.durationMinutes && (
            <span className="absolute bottom-0.5 right-1 bg-black/60 text-white text-[7px] sm:text-[8px] px-1.5 py-px rounded">
              {lesson.durationMinutes} min
            </span>
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-sm font-semibold text-[var(--color-text)] leading-tight">{lesson.title}</p>
          <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">
            {[lesson.level, lesson.intensity, lesson.equipment].filter(Boolean).join(" · ")}
          </p>
          {unlocked && (
            <p className="text-[10px] text-green-700 font-medium mt-1">✓ Desbloqueada</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {hasDetail && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="hidden sm:flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
            >
              {expanded ? "Cerrar" : "Detalles"}
              <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
            </button>
          )}
          {unlocked && lesson.videoUrl ? (
            <button
              onClick={() => onPlay(lesson.id)}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              Ver clase
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              disabled={remaining === 0}
              className="rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Canjear
            </button>
          )}
        </div>
      </div>

      {/* Mobile: detail toggle */}
      {hasDetail && !expanded && (
        <div className="px-3 pb-2 sm:hidden">
          <button
            onClick={() => setExpanded(true)}
            className="text-[10px] text-[var(--color-primary)] hover:underline"
          >
            Ver detalles ▼
          </button>
        </div>
      )}

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)]/50">
          {/* Promo video or large thumbnail */}
          {lesson.promoVideoUrl ? (
            <div className="px-3 pt-3 sm:px-4 sm:pt-4">
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-semibold mb-2">
                Adelanto
              </p>
              <div className="rounded-lg overflow-hidden">
                <VimeoEmbed url={lesson.promoVideoUrl} title={`Adelanto: ${lesson.title}`} />
              </div>
            </div>
          ) : lesson.thumbnailUrl ? (
            <div className="px-3 pt-3 sm:px-4 sm:pt-4">
              <img
                src={lesson.thumbnailUrl}
                alt={lesson.title}
                className="w-full rounded-lg object-cover max-h-52"
              />
            </div>
          ) : null}

          {/* Metadata content */}
          <div className="p-3 sm:p-4 space-y-3">
            {/* Description */}
            {lesson.description && (
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                {lesson.description}
              </p>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Equipment detail */}
            {lesson.equipment && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-[var(--color-text-muted)] font-medium shrink-0">Equipo:</span>
                <span className="text-xs text-[var(--color-text)]">{lesson.equipment}</span>
              </div>
            )}

            {/* Target audience */}
            {lesson.targetAudience && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-[var(--color-text-muted)] font-medium shrink-0">Para:</span>
                <span className="text-xs text-[var(--color-text)]">{lesson.targetAudience}</span>
              </div>
            )}

            {/* Action inside detail */}
            <div className="pt-2 flex gap-2">
              {unlocked && lesson.videoUrl ? (
                <button
                  onClick={() => onPlay(lesson.id)}
                  className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                >
                  ▶ Ver clase completa
                </button>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  disabled={remaining === 0}
                  className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {remaining !== null && remaining > 0
                    ? `Canjear clase (${remaining} disponible${remaining !== 1 ? "s" : ""})`
                    : "Canjear clase"}
                </button>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              >
                Cerrar
              </button>
            </div>
          </div>
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
