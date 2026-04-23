/**
 * Convierte una URL de un proveedor soportado en un src de iframe embebible.
 * Retorna `null` si no es soportado o la URL es inválida.
 *
 * Soporta: YouTube, Vimeo, Spotify, SoundCloud, Apple Music, Instagram.
 */

export type EmbedInfo = { src: string; aspectRatio: string };

export function parseEmbed(url: string): EmbedInfo | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
    let id = "";
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (u.pathname === "/watch") id = u.searchParams.get("v") ?? "";
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? "";
    if (!id) return null;
    return { src: `https://www.youtube.com/embed/${id}`, aspectRatio: "16/9" };
  }

  if (u.hostname.includes("vimeo.com")) {
    const id = u.pathname.split("/").filter(Boolean).pop();
    if (!id) return null;
    return { src: `https://player.vimeo.com/video/${id}`, aspectRatio: "16/9" };
  }

  if (u.hostname.includes("open.spotify.com")) {
    return {
      src: url.replace("open.spotify.com/", "open.spotify.com/embed/"),
      aspectRatio: "16/6",
    };
  }

  if (u.hostname.includes("soundcloud.com")) {
    return {
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%232d3b2a&auto_play=false`,
      aspectRatio: "16/6",
    };
  }

  if (u.hostname.includes("music.apple.com")) {
    return {
      src: url.replace("music.apple.com/", "embed.music.apple.com/"),
      aspectRatio: "16/8",
    };
  }

  if (u.hostname.includes("instagram.com")) {
    const src = url.endsWith("/") ? `${url}embed` : `${url}/embed`;
    return { src, aspectRatio: "9/16" };
  }

  return null;
}
