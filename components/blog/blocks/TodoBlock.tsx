type TodoItem = { text: string; checked?: boolean };
type TodoValue = { items: TodoItem[] };

export function TodoBlock({ value }: { value: TodoValue }) {
  const items = value.items ?? [];
  return (
    <ul className="not-prose mx-auto my-[var(--space-8)] max-w-[65ch] space-y-2 text-base text-[var(--color-text)]">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-[0.35rem] flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
              item.checked
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[10px] text-white"
                : "border-[var(--color-border)]"
            }`}
          >
            {item.checked ? "✓" : ""}
          </span>
          <span className={item.checked ? "text-[var(--color-text-muted)] line-through" : ""}>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
