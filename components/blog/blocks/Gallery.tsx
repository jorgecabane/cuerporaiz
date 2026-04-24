"use client";

import Image from "next/image";
import { useState } from "react";
import { urlForImage } from "@/lib/sanity/image";

type GalleryImage = {
  _key?: string;
  alt?: string;
  caption?: string;
  asset?: unknown;
};

type GalleryValue = {
  images: GalleryImage[];
  layout?: "grid" | "carousel" | "masonry";
};

export function Gallery({ value }: { value: GalleryValue }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = value.images ?? [];
  if (images.length === 0) return null;

  const gridClasses =
    value.layout === "carousel"
      ? "flex gap-2 overflow-x-auto snap-x snap-mandatory"
      : value.layout === "masonry"
      ? "columns-2 md:columns-3 gap-2 [&>*]:mb-2 [&>*]:break-inside-avoid"
      : "grid grid-cols-2 md:grid-cols-3 gap-2";

  return (
    <div className="not-prose mx-auto my-[var(--space-10)] max-w-[52rem]">
      <div className={gridClasses}>
        {images.map((img, i) => {
          const url = urlForImage(img.asset as Parameters<typeof urlForImage>[0]);
          if (!url) return null;
          const key = img._key ?? `img-${i}`;
          const classes =
            value.layout === "carousel"
              ? "snap-start shrink-0 w-[80%] md:w-[45%]"
              : value.layout === "masonry"
              ? "w-full"
              : "aspect-square";

          return (
            <button
              key={key}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className={`${classes} overflow-hidden rounded-[var(--radius-sm)] transition-transform duration-[var(--duration-normal)] ease-out hover:scale-[1.02]`}
              aria-label={`Ampliar imagen ${i + 1}`}
            >
              <Image
                src={url}
                alt={img.alt ?? ""}
                width={800}
                height={value.layout === "masonry" ? 0 : 800}
                sizes="(max-width: 768px) 50vw, 30vw"
                className={value.layout === "masonry" ? "h-auto w-full" : "h-full w-full object-cover"}
              />
            </button>
          );
        })}
      </div>

      {lightboxIndex !== null ? (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNav={(dir) => {
            setLightboxIndex((prev) => {
              if (prev === null) return null;
              const next = prev + dir;
              if (next < 0) return images.length - 1;
              if (next >= images.length) return 0;
              return next;
            });
          }}
        />
      ) : null}
    </div>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onNav,
}: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onNav: (dir: number) => void;
}) {
  const img = images[index];
  const url = urlForImage(img.asset as Parameters<typeof urlForImage>[0]);
  if (!url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        ✕
      </button>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={(e) => {
              e.stopPropagation();
              onNav(-1);
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={(e) => {
              e.stopPropagation();
              onNav(1);
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            →
          </button>
        </>
      ) : null}
      <figure
        className="max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={url}
          alt={img.alt ?? ""}
          width={1800}
          height={1200}
          className="h-auto max-h-[80vh] w-auto object-contain"
        />
        {img.caption ? (
          <figcaption className="mt-3 text-center text-sm italic text-white/80">
            {img.caption}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}
