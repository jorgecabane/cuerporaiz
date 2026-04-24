"use client";

import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";

type CalloutValue = {
  tone: "tip" | "info" | "warning" | "quote";
  title?: string;
  body: PortableTextBlock[];
};

const ICONS: Record<CalloutValue["tone"], string> = {
  tip: "💡",
  info: "ℹ️",
  warning: "⚠️",
  quote: "“",
};

const TONE_CLASSES: Record<CalloutValue["tone"], string> = {
  tip: "bg-[color-mix(in_srgb,var(--color-secondary)_10%,transparent)] border-[var(--color-secondary)]",
  info: "bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] border-[var(--color-primary)]",
  warning: "bg-[color-mix(in_srgb,#d97706_12%,transparent)] border-[#d97706]",
  quote: "bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)] border-[var(--color-primary)]",
};

const inlineComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  },
};

export function Callout({ value }: { value: CalloutValue }) {
  const tone = value.tone ?? "tip";
  return (
    <aside
      className={`not-prose mx-auto my-[var(--space-10)] max-w-[42rem] rounded-[var(--radius-md)] border-l-[3px] px-7 py-6 font-sans text-base leading-relaxed ${TONE_CLASSES[tone]}`}
      role="note"
    >
      {value.title ? (
        <p className="mb-1 font-semibold text-[var(--color-text)]">
          <span aria-hidden="true" className="mr-2">
            {ICONS[tone]}
          </span>
          {value.title}
        </p>
      ) : null}
      <div className="text-[var(--color-text)]">
        <PortableText value={value.body} components={inlineComponents} />
      </div>
    </aside>
  );
}
