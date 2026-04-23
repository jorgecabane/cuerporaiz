import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";

type ToggleValue = { summary: string; body: PortableTextBlock[] };

const bodyComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mb-3 text-base leading-relaxed last:mb-0">{children}</p>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-3 list-disc space-y-1 pl-6 text-base marker:text-[var(--color-secondary)]">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mb-3 list-decimal space-y-1 pl-6 text-base">{children}</ol>
    ),
  },
};

export function ToggleBlock({ value }: { value: ToggleValue }) {
  return (
    <details className="not-prose group mx-auto my-[var(--space-8)] max-w-[65ch] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-display text-lg text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_4%,transparent)]">
        <span>{value.summary}</span>
        <span
          aria-hidden="true"
          className="text-base text-[var(--color-text-muted)] transition-transform duration-[var(--duration-normal)] group-open:rotate-90"
        >
          ▸
        </span>
      </summary>
      <div className="px-5 pb-4 text-[var(--color-text)]">
        <PortableText value={value.body} components={bodyComponents} />
      </div>
    </details>
  );
}
