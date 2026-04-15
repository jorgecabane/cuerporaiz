function toEmbedUrl(url: string): string {
  // Vimeo: https://vimeo.com/471549782/03c6c6280f → https://player.vimeo.com/video/471549782?h=03c6c6280f
  // Also handles public (no hash) and already-embed URLs
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/);
  if (vimeoMatch && !url.includes("player.vimeo.com")) {
    const hash = vimeoMatch[2] ? `?h=${vimeoMatch[2]}` : "";
    return `https://player.vimeo.com/video/${vimeoMatch[1]}${hash}`;
  }

  // YouTube: https://www.youtube.com/watch?v=ID → https://www.youtube.com/embed/ID
  const ytWatchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (ytWatchMatch) {
    return `https://www.youtube.com/embed/${ytWatchMatch[1]}`;
  }

  // YouTube short: https://youtu.be/ID → https://www.youtube.com/embed/ID
  const ytShortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (ytShortMatch) {
    return `https://www.youtube.com/embed/${ytShortMatch[1]}`;
  }

  // Already an embed URL or unknown format — pass through
  return url;
}

interface VimeoEmbedProps {
  url: string;
  title?: string;
}

export function VimeoEmbed({ url, title }: VimeoEmbedProps) {
  return (
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <iframe
        src={toEmbedUrl(url)}
        title={title ?? "Video"}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="absolute inset-0 w-full h-full rounded-[var(--radius-md)]"
      />
    </div>
  );
}
