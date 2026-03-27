"use client";

import { useState } from "react";
import { VimeoEmbed } from "./VimeoEmbed";
import { UnlockModal } from "./UnlockModal";

interface LessonCardLesson {
  id: string;
  title: string;
  durationMinutes: number | null;
  level: string | null;
  thumbnailUrl: string | null;
  videoUrl?: string | null;
}

interface LessonCardProps {
  lesson: LessonCardLesson;
  categoryName: string;
  unlocked: boolean;
  remaining: number | null;
  onUnlocked: () => void;
}

export function LessonCard({
  lesson,
  categoryName,
  unlocked,
  remaining,
  onUnlocked,
}: LessonCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex gap-3 p-4">
        {lesson.thumbnailUrl ? (
          <img
            src={lesson.thumbnailUrl}
            alt={lesson.title}
            className="h-16 w-24 flex-shrink-0 rounded object-cover"
          />
        ) : (
          <div className="h-16 w-24 flex-shrink-0 rounded bg-gray-100" />
        )}

        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <p className="font-medium text-[var(--color-text)] truncate">{lesson.title}</p>
          <div className="flex flex-wrap gap-1.5">
            {lesson.durationMinutes && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {lesson.durationMinutes} min
              </span>
            )}
            {lesson.level && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {lesson.level}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center">
          {unlocked && lesson.videoUrl ? (
            <button
              onClick={() => setShowVideo((v) => !v)}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              {showVideo ? "Cerrar" : "Ver clase"}
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              disabled={remaining === 0 && !unlocked}
              className="rounded-[var(--radius-md)] border border-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Desbloquear
            </button>
          )}
        </div>
      </div>

      {showVideo && lesson.videoUrl && (
        <div className="px-4 pb-4">
          <VimeoEmbed url={lesson.videoUrl} title={lesson.title} />
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
