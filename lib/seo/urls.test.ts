import { describe, it, expect } from "vitest";
import { absoluteUrl, getSiteUrl, isProductionEnv, resolveImageUrl } from "./urls";

describe("getSiteUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.com" })).toBe("https://example.com");
  });

  it("strips trailing slash", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.com/" })).toBe("https://example.com");
  });

  it("falls back to VERCEL_URL with https prefix", () => {
    expect(getSiteUrl({ VERCEL_URL: "preview-abc.vercel.app" })).toBe("https://preview-abc.vercel.app");
  });

  it("defaults to cuerporaiz.cl", () => {
    expect(getSiteUrl({})).toBe("https://cuerporaiz.cl");
  });

  it("prefers NEXT_PUBLIC_SITE_URL over VERCEL_URL", () => {
    expect(
      getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://cuerporaiz.cl", VERCEL_URL: "preview.vercel.app" }),
    ).toBe("https://cuerporaiz.cl");
  });
});

describe("absoluteUrl", () => {
  const env = { NEXT_PUBLIC_SITE_URL: "https://cuerporaiz.cl" };

  it("returns absolute URL unchanged", () => {
    expect(absoluteUrl("https://other.com/path", env)).toBe("https://other.com/path");
  });

  it("prepends site URL to relative path", () => {
    expect(absoluteUrl("/blog/post", env)).toBe("https://cuerporaiz.cl/blog/post");
  });

  it("adds missing leading slash", () => {
    expect(absoluteUrl("blog/post", env)).toBe("https://cuerporaiz.cl/blog/post");
  });

  it("handles root path", () => {
    expect(absoluteUrl("/", env)).toBe("https://cuerporaiz.cl/");
  });
});

describe("resolveImageUrl", () => {
  const env = { NEXT_PUBLIC_SITE_URL: "https://cuerporaiz.cl" };

  it("returns null for null/empty/undefined", () => {
    expect(resolveImageUrl(null, env)).toBeNull();
    expect(resolveImageUrl(undefined, env)).toBeNull();
    expect(resolveImageUrl("", env)).toBeNull();
  });

  it("keeps absolute https URL intact", () => {
    expect(resolveImageUrl("https://cdn.sanity.io/foo.jpg", env)).toBe("https://cdn.sanity.io/foo.jpg");
  });

  it("makes relative image URL absolute", () => {
    expect(resolveImageUrl("/img/hero.jpg", env)).toBe("https://cuerporaiz.cl/img/hero.jpg");
  });
});

describe("isProductionEnv", () => {
  it("true when VERCEL_ENV=production", () => {
    expect(isProductionEnv({ VERCEL_ENV: "production" })).toBe(true);
  });

  it("false when VERCEL_ENV=preview", () => {
    expect(isProductionEnv({ VERCEL_ENV: "preview" })).toBe(false);
  });

  it("false when VERCEL_ENV=development", () => {
    expect(isProductionEnv({ VERCEL_ENV: "development" })).toBe(false);
  });

  it("true when VERCEL_ENV is unset (self-hosted / local)", () => {
    expect(isProductionEnv({})).toBe(true);
  });
});
