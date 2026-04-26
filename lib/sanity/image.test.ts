import { describe, it, expect } from "vitest";
import { withSanityImageParams } from "./image";

describe("withSanityImageParams", () => {
  it("adds params to a Sanity CDN URL", () => {
    const out = withSanityImageParams("https://cdn.sanity.io/images/p/d/abc.png", { w: 32, h: 32 });
    expect(out).toContain("w=32");
    expect(out).toContain("h=32");
    expect(out.startsWith("https://cdn.sanity.io/")).toBe(true);
  });

  it("preserves existing query params on Sanity URLs", () => {
    const out = withSanityImageParams("https://cdn.sanity.io/images/p/d/abc.png?auto=format", { w: 32 });
    expect(out).toContain("auto=format");
    expect(out).toContain("w=32");
  });

  it("returns non-Sanity URLs unchanged", () => {
    const url = "https://example.com/favicon.png";
    expect(withSanityImageParams(url, { w: 32 })).toBe(url);
  });

  it("coerces numeric params to strings in the URL", () => {
    const out = withSanityImageParams("https://cdn.sanity.io/x.png", { w: 180, h: 180, fit: "crop" });
    expect(out).toMatch(/w=180/);
    expect(out).toMatch(/h=180/);
    expect(out).toMatch(/fit=crop/);
  });

  it("returns the original string if URL parsing fails", () => {
    const out = withSanityImageParams("not-a-valid-url", { w: 32 });
    expect(out).toBe("not-a-valid-url");
  });
});
