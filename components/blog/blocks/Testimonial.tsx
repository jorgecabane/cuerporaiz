import Image from "next/image";
import { urlForImage } from "@/lib/sanity/image";

type TestimonialValue = {
  quote: string;
  authorName: string;
  authorContext?: string;
  photo?: unknown;
};

export function Testimonial({ value }: { value: TestimonialValue }) {
  const photoUrl = urlForImage(value.photo as Parameters<typeof urlForImage>[0]);

  return (
    <figure className="not-prose mx-auto my-[var(--space-10)] max-w-[42rem] rounded-2xl bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-sm)]">
      <blockquote className="font-display text-xl italic leading-relaxed text-[var(--color-text)]">
        &ldquo;{value.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-[var(--space-4)] flex items-center gap-3">
        {photoUrl ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-full">
            <Image src={photoUrl} alt={value.authorName} fill sizes="48px" className="object-cover" />
          </div>
        ) : null}
        <div className="text-sm">
          <p className="font-medium text-[var(--color-text)]">{value.authorName}</p>
          {value.authorContext ? (
            <p className="text-[var(--color-text-muted)]">{value.authorContext}</p>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}
