import {
  PortableText,
  type PortableTextComponents,
  type PortableTextTypeComponent,
} from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { ImageBlock } from "./ImageBlock";

type TwoColumnValue = {
  ratio?: "50-50" | "33-67" | "67-33";
  left: PortableTextBlock[];
  right: PortableTextBlock[];
};

const columnComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mb-3 text-base leading-relaxed text-[var(--color-text)] last:mb-0">
        {children}
      </p>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 font-display text-xl text-[var(--color-primary)]">{children}</h4>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  },
  types: {
    imageBlock: ImageBlock as unknown as PortableTextTypeComponent,
  },
};

const RATIO_CLASSES: Record<NonNullable<TwoColumnValue["ratio"]>, string> = {
  "50-50": "md:grid-cols-2",
  "33-67": "md:grid-cols-[1fr_2fr]",
  "67-33": "md:grid-cols-[2fr_1fr]",
};

export function TwoColumn({ value }: { value: TwoColumnValue }) {
  const ratio = value.ratio ?? "50-50";
  return (
    <div
      className={`not-prose mx-auto my-[var(--space-10)] grid max-w-[80ch] grid-cols-1 items-center gap-[var(--space-8)] ${RATIO_CLASSES[ratio]}`}
    >
      <div>
        <PortableText value={value.left} components={columnComponents} />
      </div>
      <div>
        <PortableText value={value.right} components={columnComponents} />
      </div>
    </div>
  );
}
