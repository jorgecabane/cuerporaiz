import { parseEmbed } from "@/lib/sanity/embed";

type EmbedValue = { url: string; caption?: string };

export function Embed({ value }: { value: EmbedValue }) {
  const info = parseEmbed(value.url);
  if (!info) {
    return (
      <div className="not-prose mx-auto my-[var(--space-10)] max-w-[52rem] rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        No se pudo procesar el enlace: {value.url}
      </div>
    );
  }

  return (
    <div className="not-prose mx-auto my-[var(--space-10)] max-w-[52rem]">
      <div
        className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-primary)]"
        style={{ aspectRatio: info.aspectRatio }}
      >
        <iframe
          src={info.src}
          loading="lazy"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={value.caption ?? "Contenido embebido"}
        />
      </div>
      {value.caption ? (
        <p className="mt-2 text-center text-sm italic text-[var(--color-text-muted)]">
          {value.caption}
        </p>
      ) : null}
    </div>
  );
}
