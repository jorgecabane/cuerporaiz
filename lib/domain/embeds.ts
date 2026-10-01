/** Helpers para incrustar contenido externo configurado por el centro. */

function parseHttps(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** open.spotify.com/{playlist|album|episode|show|track}/{id} → URL del reproductor embebido. */
export function spotifyEmbedUrl(raw: string | null | undefined): string | null {
  const url = parseHttps(raw);
  if (!url || url.hostname !== "open.spotify.com") return null;
  const match = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?(playlist|album|episode|show|track)\/([A-Za-z0-9]+)/);
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : null;
}

/** YouTube (watch, youtu.be, shorts) o Vimeo → URL embebible. */
export function videoEmbedUrl(raw: string | null | undefined): string | null {
  const url = parseHttps(raw);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "");
  const id = (value: string | null | undefined) => (value && /^[\w-]{6,}$/.test(value) ? value : null);

  if (host === "youtube.com" || host === "m.youtube.com") {
    const yt = id(url.searchParams.get("v")) ?? id(url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]);
    return yt ? `https://www.youtube-nocookie.com/embed/${yt}` : null;
  }
  if (host === "youtu.be") {
    const yt = id(url.pathname.slice(1));
    return yt ? `https://www.youtube-nocookie.com/embed/${yt}` : null;
  }
  if (host === "vimeo.com") {
    const vimeo = url.pathname.match(/^\/(\d+)/)?.[1];
    return vimeo ? `https://player.vimeo.com/video/${vimeo}` : null;
  }
  return null;
}

/** Mapa embebido de Google a partir de una dirección (sin API key). */
export function googleMapsEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

export function googleMapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** "Tu primera clase": una idea por línea, sin líneas vacías. */
export function splitLines(text: string | null | undefined): string[] {
  return (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
}
