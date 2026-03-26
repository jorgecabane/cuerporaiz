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
