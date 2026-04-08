import { Skeleton } from "./Skeleton";

/**
 * Content-aware skeleton for PanelHomeCalendar.
 * Mimics: WeekNav + 7 day pills + 3 class cards.
 */
export function CalendarHomeSkeleton() {
  return (
    <div className="space-y-4">
      {/* Week nav bar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Day selector pills */}
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-14 rounded-[var(--radius-lg)]" />
        ))}
      </div>

      {/* Class cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Content-aware skeleton for reservation/class lists in sheets.
 * Mimics: Tab bar + list of reservations with time and class info.
 */
export function ReservationListSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Tab bar */}
      <div className="flex gap-4 border-b border-[var(--color-border)] pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-20" />
        ))}
      </div>

      {/* List items */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

/**
 * Content-aware skeleton for client/student list.
 * Mimics: Search bar + list of students with avatar, name, email.
 */
export function ClientListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Content-aware skeleton for attendance list.
 * Mimics: list of students with attendance buttons.
 */
export function AttendanceListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-[var(--radius-md)]" />
            <Skeleton className="h-8 w-20 rounded-[var(--radius-md)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
