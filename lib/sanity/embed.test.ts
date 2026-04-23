import { describe, it, expect } from "vitest";
import { parseEmbed } from "./embed";

describe("parseEmbed", () => {
  describe("YouTube", () => {
    it("parses youtube.com/watch?v=", () => {
      const result = parseEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result).toEqual({
        src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        aspectRatio: "16/9",
      });
    });

    it("parses youtu.be short URL", () => {
      const result = parseEmbed("https://youtu.be/dQw4w9WgXcQ");
      expect(result?.src).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });

    it("parses youtube.com/embed/", () => {
      const result = parseEmbed("https://www.youtube.com/embed/abc123");
      expect(result?.src).toBe("https://www.youtube.com/embed/abc123");
    });

    it("returns null for YouTube URL without video id", () => {
      expect(parseEmbed("https://www.youtube.com/watch")).toBeNull();
    });
  });

  describe("Vimeo", () => {
    it("parses vimeo.com/<id>", () => {
      const result = parseEmbed("https://vimeo.com/76979871");
      expect(result).toEqual({
        src: "https://player.vimeo.com/video/76979871",
        aspectRatio: "16/9",
      });
    });
  });

  describe("Spotify", () => {
    it("replaces open.spotify.com/ with embed variant", () => {
      const result = parseEmbed("https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6");
      expect(result?.src).toContain("open.spotify.com/embed/track/");
      expect(result?.aspectRatio).toBe("16/6");
    });
  });

  describe("SoundCloud", () => {
    it("wraps the URL in the SoundCloud player endpoint", () => {
      const input = "https://soundcloud.com/example/track";
      const result = parseEmbed(input);
      expect(result?.src).toContain("w.soundcloud.com/player/");
      expect(result?.src).toContain(encodeURIComponent(input));
    });
  });

  describe("Apple Music", () => {
    it("rewrites music.apple.com to embed.music.apple.com", () => {
      const result = parseEmbed("https://music.apple.com/us/album/example/1");
      expect(result?.src).toContain("embed.music.apple.com");
    });
  });

  describe("Instagram", () => {
    it("appends /embed to the path", () => {
      const result = parseEmbed("https://www.instagram.com/p/C123abc");
      expect(result?.src).toContain("/embed");
      expect(result?.aspectRatio).toBe("9/16");
    });
  });

  describe("unsupported and invalid", () => {
    it("returns null for unsupported hosts", () => {
      expect(parseEmbed("https://example.com/video")).toBeNull();
    });

    it("returns null for malformed URLs", () => {
      expect(parseEmbed("not-a-url")).toBeNull();
    });
  });
});
