import { describe, it, expect } from "vitest";
import { spotifyEmbedUrl, videoEmbedUrl, googleMapsEmbedUrl, googleMapsLink, splitLines } from "./embeds";

describe("spotifyEmbedUrl", () => {
  it("convierte links de Spotify al reproductor embebido", () => {
    expect(spotifyEmbedUrl("https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO?si=abc")).toBe(
      "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO"
    );
    expect(spotifyEmbedUrl("https://open.spotify.com/intl-es/episode/7makk4oTQel546B0PZlDM5")).toBe(
      "https://open.spotify.com/embed/episode/7makk4oTQel546B0PZlDM5"
    );
  });
  it("rechaza otros dominios, http y URLs inválidas", () => {
    expect(spotifyEmbedUrl("https://evil.com/playlist/abc")).toBeNull();
    expect(spotifyEmbedUrl("http://open.spotify.com/playlist/abc")).toBeNull();
    expect(spotifyEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(spotifyEmbedUrl("")).toBeNull();
  });
});

describe("videoEmbedUrl", () => {
  it("soporta YouTube (watch, youtu.be, shorts) y Vimeo", () => {
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ?t=3")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedUrl("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(videoEmbedUrl("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871");
  });
  it("rechaza lo que no reconoce", () => {
    expect(videoEmbedUrl("https://instagram.com/reel/abc")).toBeNull();
    expect(videoEmbedUrl("https://youtube.com/watch?v=<script>")).toBeNull();
    expect(videoEmbedUrl(null)).toBeNull();
  });
});

describe("maps / splitLines", () => {
  it("codifica la dirección", () => {
    expect(googleMapsEmbedUrl("Av. Kennedy 6690, Vitacura")).toBe(
      "https://www.google.com/maps?q=Av.%20Kennedy%206690%2C%20Vitacura&output=embed"
    );
    expect(googleMapsLink("A & B")).toBe("https://www.google.com/maps/search/?api=1&query=A%20%26%20B");
  });
  it("separa por líneas y descarta vacías", () => {
    expect(splitLines(" Llega antes \n\n Ropa cómoda ")).toEqual(["Llega antes", "Ropa cómoda"]);
    expect(splitLines(null)).toEqual([]);
  });
});
