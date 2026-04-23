import Image from "next/image";
import { urlForImage } from "@/lib/sanity/image";

type ImageBlockValue = {
  asset?: unknown;
  alt?: string;
  caption?: string;
  fullBleed?: boolean;
};

export function ImageBlock({ value }: { value: ImageBlockValue }) {
  const url = urlForImage(value.asset as Parameters<typeof urlForImage>[0]);
  if (!url) return null;

  const wrapperClass = value.fullBleed
    ? "not-prose -mx-6 md:mx-auto max-w-5xl my-[var(--space-10)]"
    : "not-prose mx-auto max-w-[80ch] my-[var(--space-8)]";

  return (
    <figure className={wrapperClass}>
      <div className="relative overflow-hidden rounded-[var(--radius-lg)]">
        <Image
          src={url}
          alt={value.alt ?? ""}
          width={1600}
          height={900}
          sizes="(max-width: 1024px) 100vw, 960px"
          className="h-auto w-full"
        />
      </div>
      {value.caption ? (
        <figcaption className="mt-3 text-center text-sm italic text-[var(--color-text-muted)]">
          {value.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
