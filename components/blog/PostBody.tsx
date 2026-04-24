"use client";

import Link from "next/link";
import {
  PortableText,
  type PortableTextComponents,
  type PortableTextTypeComponent,
} from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";

import { ImageBlock } from "./blocks/ImageBlock";
import { PullQuote } from "./blocks/PullQuote";
import { Callout } from "./blocks/Callout";
import { CTAButton } from "./blocks/CTAButton";
import { Divider } from "./blocks/Divider";
import { Gallery } from "./blocks/Gallery";
import { Embed } from "./blocks/Embed";
import { TwoColumn } from "./blocks/TwoColumn";
import { TableBlock } from "./blocks/TableBlock";
import { ToggleBlock } from "./blocks/ToggleBlock";
import { TodoBlock } from "./blocks/TodoBlock";
import { AsanaCard } from "./blocks/AsanaCard";
import { BreathPattern } from "./blocks/BreathPattern";
import { FeaturedEvent } from "./blocks/FeaturedEvent";
import { Testimonial } from "./blocks/Testimonial";

type AnyTypeComponent = PortableTextTypeComponent;

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mx-auto mb-6 max-w-[42rem] font-display text-xl leading-[1.75] text-[var(--color-text)]">
        {children}
      </p>
    ),
    h2: ({ children }) => (
      <h2 className="mx-auto mb-4 mt-12 max-w-[42rem] font-display text-3xl tracking-tight text-[var(--color-primary)] md:text-4xl">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mx-auto mb-3 mt-10 max-w-[42rem] font-display text-2xl text-[var(--color-primary)]">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mx-auto mb-2 mt-8 max-w-[42rem] font-display text-xl text-[var(--color-primary)]">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mx-auto my-8 max-w-[42rem] border-l-[3px] border-[var(--color-secondary)] pl-5 font-display text-xl italic leading-relaxed text-[var(--color-text-muted)]">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mx-auto mb-6 max-w-[42rem] list-disc space-y-2 pl-6 font-display text-xl leading-[1.75] text-[var(--color-text)] marker:text-[var(--color-secondary)]">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mx-auto mb-6 max-w-[42rem] list-decimal space-y-2 pl-6 font-display text-xl leading-[1.75] text-[var(--color-text)]">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    "strike-through": ({ children }) => <s>{children}</s>,
    code: ({ children }) => (
      <code className="rounded bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-1.5 py-0.5 font-mono text-[0.9em]">
        {children}
      </code>
    ),
    link: ({ value, children }) => {
      const href: string = value?.href ?? "#";
      const openInNewTab: boolean = Boolean(value?.openInNewTab);
      const isExternal = /^https?:\/\//.test(href);
      const className =
        "text-[var(--color-secondary)] underline decoration-[1px] underline-offset-[3px] hover:text-[var(--color-secondary-hover)]";

      if (isExternal || openInNewTab) {
        return (
          <a
            href={href}
            target="_blank"
            rel={isExternal ? "noopener noreferrer" : undefined}
            className={className}
          >
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    },
  },
  types: {
    imageBlock: ImageBlock as unknown as AnyTypeComponent,
    pullQuote: PullQuote as unknown as AnyTypeComponent,
    callout: Callout as unknown as AnyTypeComponent,
    ctaButton: CTAButton as unknown as AnyTypeComponent,
    divider: Divider as unknown as AnyTypeComponent,
    gallery: Gallery as unknown as AnyTypeComponent,
    embed: Embed as unknown as AnyTypeComponent,
    twoColumn: TwoColumn as unknown as AnyTypeComponent,
    tableBlock: TableBlock as unknown as AnyTypeComponent,
    toggleBlock: ToggleBlock as unknown as AnyTypeComponent,
    todoBlock: TodoBlock as unknown as AnyTypeComponent,
    asanaCard: AsanaCard as unknown as AnyTypeComponent,
    breathPattern: BreathPattern as unknown as AnyTypeComponent,
    featuredEvent: FeaturedEvent as unknown as AnyTypeComponent,
    testimonial: Testimonial as unknown as AnyTypeComponent,
  },
};

export function PostBody({ value }: { value: PortableTextBlock[] }) {
  return <PortableText value={value} components={components} />;
}
