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
    lesson.targetAudience,
    ...(lesson.tags?.split(",").map((t) => t.trim()) ?? []),
  ].filter(Boolean);

  const otherLessons = siblings.filter((s) => s.id !== lesson.id);

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text)] mb-4 hover:text-[var(--color-primary)] transition-colors"
      >
        <span className="text-lg">←</span>
        <span>Volver a {practiceName}</span>
      </button>

      {/* Video — edge-to-edge on mobile, rounded on desktop */}
      <div className="sm:rounded-[var(--radius-lg)] overflow-hidden -mx-4 sm:mx-0 mb-6 shadow-lg">
        <VimeoEmbed url={lesson.videoUrl} title={lesson.title} />
      </div>

      {/* Lesson info card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6 mb-6">
        {/* Title + duration row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text)] leading-tight">
              {lesson.title}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {practiceName}
            </p>
          </div>
          {lesson.durationMinutes && (
            <div className="flex-shrink-0 rounded-full bg-[var(--color-primary)] px-3 py-1">
              <span className="text-xs font-semibold text-white">{lesson.durationMinutes} min</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {lesson.description && (
          <p className="text-sm text-[var(--color-text)] leading-relaxed mb-4">
            {lesson.description}
          </p>
        )}

        {/* Equipment & audience detail */}
        {(lesson.equipment ?? lesson.targetAudience) && (
          <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
            {lesson.equipment && (
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] w-16 shrink-0">Equipo</span>
                <span className="text-xs text-[var(--color-text)]">{lesson.equipment}</span>
              </div>
            )}
            {lesson.targetAudience && (
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] w-16 shrink-0">Para</span>
                <span className="text-xs text-[var(--color-text)]">{lesson.targetAudience}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next in practice */}
      {otherLessons.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-[var(--color-text)] mb-3">
            Más en {practiceName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {otherLessons.map((s) => (
              <button
                key={s.id}
                onClick={() => onNavigate(s.id)}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left hover:shadow-sm transition-shadow group"
              >
                <div
                  className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{
                    background: s.thumbnailUrl
                      ? `url(${s.thumbnailUrl}) center/cover`
                      : "linear-gradient(135deg, var(--color-primary-light), var(--color-primary))",
                  }}
                >
                  <div className="w-5 h-5 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-[8px]">
                    {s.unlocked ? "▶" : "🔒"}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                    {s.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {[
                      s.durationMinutes ? `${s.durationMinutes} min` : null,
                      s.intensity,
                      s.unlocked ? "Desbloqueada" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
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
