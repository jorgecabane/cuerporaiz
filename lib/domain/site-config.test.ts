import { describe, it, expect } from "vitest";
import { SECTION_KEYS } from "./site-config";
import type { SectionKey } from "./site-config";

describe("SECTION_KEYS", () => {
  it("contains all expected section keys", () => {
    expect(SECTION_KEYS).toContain("hero");
    expect(SECTION_KEYS).toContain("about");
    expect(SECTION_KEYS).toContain("how-it-works");
    expect(SECTION_KEYS).toContain("schedule");
    expect(SECTION_KEYS).toContain("plans");
    expect(SECTION_KEYS).toContain("on-demand");
    expect(SECTION_KEYS).toContain("disciplines");
    expect(SECTION_KEYS).toContain("team");
    expect(SECTION_KEYS).toContain("testimonials");
    expect(SECTION_KEYS).toContain("cta");
    expect(SECTION_KEYS).toContain("contact");
  });

  it("has 11 section keys", () => {
    expect(SECTION_KEYS.length).toBe(11);
  });

  it("SectionKey type is satisfied by each element", () => {
    // Type-level check: each element assignable to SectionKey
    const keys: SectionKey[] = [...SECTION_KEYS];
    expect(keys.length).toBe(SECTION_KEYS.length);
  });
});
