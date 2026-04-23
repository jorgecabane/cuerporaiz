type DividerValue = { style?: "line" | "ornament" | "lotus" };

export function Divider({ value }: { value: DividerValue }) {
  const style = value.style ?? "line";

  if (style === "line") {
    return (
      <hr className="not-prose mx-auto my-[var(--space-10)] max-w-[400px] border-t border-[var(--color-border)]" />
    );
  }

  const ornament = style === "lotus" ? "❋" : "·";

  return (
    <div
      className="not-prose mx-auto my-[var(--space-12)] flex max-w-[400px] items-center justify-center gap-3 text-[var(--color-text-muted)]"
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-[var(--color-border)]" />
      <span className="font-display text-lg italic">{ornament}</span>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}
