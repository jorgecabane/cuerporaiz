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
