import Image from "next/image";
import { urlForImage } from "@/lib/sanity/image";
import type { PostAuthorRef } from "@/lib/sanity/types";

export function AuthorCard({ author }: { author: PostAuthorRef }) {
  const photoUrl = urlForImage(author.photo) ?? "";

  return (
    <aside className="mx-auto mb-[var(--space-8)] mt-[var(--space-12)] grid max-w-[65ch] grid-cols-[88px_1fr] gap-[var(--space-5)] border-t border-[var(--color-border)] pt-[var(--space-12)]">
      <div className="relative h-[88px] w-[88px] overflow-hidden rounded-full bg-[var(--color-primary-light)]">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={author.photo?.alt ?? author.name}
            fill
            sizes="88px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div>
        <h4 className="font-display text-2xl leading-tight text-[var(--color-primary)]">
          {author.name}
        </h4>
        {author.role ? (
          <p className="mb-2 text-sm text-[var(--color-text-muted)]">{author.role}</p>
        ) : null}
        {author.bio ? (
          <p className="text-[0.9375rem] leading-relaxed text-[var(--color-text)]">{author.bio}</p>
        ) : null}
        {author.socials && (author.socials.instagram || author.socials.web) ? (
          <div className="mt-3 flex gap-3 text-sm">
            {author.socials.instagram ? (
              <a
                href={author.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-secondary)] underline underline-offset-[3px]"
              >
                Instagram
              </a>
            ) : null}
            {author.socials.web ? (
              <a
                href={author.socials.web}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-secondary)] underline underline-offset-[3px]"
              >
                Web
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
