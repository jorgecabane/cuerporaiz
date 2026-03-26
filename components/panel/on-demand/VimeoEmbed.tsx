interface VimeoEmbedProps {
  url: string;
  title?: string;
}

export function VimeoEmbed({ url, title }: VimeoEmbedProps) {
  return (
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <iframe
        src={url}
        title={title ?? "Video"}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full rounded-[var(--radius-md)]"
      />
    </div>
  );
}
