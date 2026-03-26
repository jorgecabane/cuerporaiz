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
