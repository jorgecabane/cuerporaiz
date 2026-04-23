type PullQuoteValue = { quote: string; attribution?: string };

export function PullQuote({ value }: { value: PullQuoteValue }) {
  return (
    <figure className="not-prose mx-auto my-[var(--space-12)] max-w-[65ch] px-4 text-center">
      <span
        aria-hidden="true"
        className="block font-display text-[6rem] leading-[0.5] text-[var(--color-secondary)]"
      >
        &ldquo;
      </span>
      <blockquote className="-mt-2 font-display text-2xl italic leading-snug text-[var(--color-primary)] md:text-3xl">
        {value.quote}
      </blockquote>
      {value.attribution ? (
        <figcaption className="mt-6 text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
          — {value.attribution}
        </figcaption>
      ) : null}
    </figure>
  );
}
