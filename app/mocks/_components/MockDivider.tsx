export function MockDivider({ label, note }: { label: string; note?: string }) {
  return (
    <div className="border-y border-dashed border-[var(--color-border)] bg-[var(--color-tertiary)] px-[var(--space-4)] py-[var(--space-6)]">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-secondary)]">
          {label}
        </p>
        {note && (
          <p className="mt-[var(--space-2)] text-sm text-[var(--color-text-muted)]">{note}</p>
        )}
      </div>
    </div>
  );
}
