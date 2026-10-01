import { describe, it, expect } from "vitest";
import { SECTION_KEYS, toFaqItems, type SiteSectionItem } from "./site-config";
import type { SectionKey } from "./site-config";

describe("SECTION_KEYS", () => {
  it("contains all expected section keys", () => {
    expect(SECTION_KEYS).toContain("hero");
    expect(SECTION_KEYS).toContain("about");
    expect(SECTION_KEYS).toContain("how-it-works");
    expect(SECTION_KEYS).toContain("schedule");
    expect(SECTION_KEYS).toContain("plans");
    expect(SECTION_KEYS).toContain("on-demand");
    expect(SECTION_KEYS).toContain("events");
    expect(SECTION_KEYS).toContain("disciplines");
    expect(SECTION_KEYS).toContain("team");
    expect(SECTION_KEYS).toContain("testimonials");
    expect(SECTION_KEYS).toContain("cta");
    expect(SECTION_KEYS).toContain("contact");
    expect(SECTION_KEYS).toContain("faq");
    expect(SECTION_KEYS).toContain("gallery");
    expect(SECTION_KEYS).toContain("playlist");
    expect(SECTION_KEYS).toContain("newsletter");
  });

  it("has 12 section keys", () => {
    expect(SECTION_KEYS.length).toBe(16);
  });

  it("SectionKey type is satisfied by each element", () => {
    // Type-level check: each element assignable to SectionKey
    const keys: SectionKey[] = [...SECTION_KEYS];
    expect(keys.length).toBe(SECTION_KEYS.length);
  });
});

describe("toFaqItems", () => {
  const item = (o: Partial<SiteSectionItem>): SiteSectionItem => ({
    id: "i", sectionId: "s", title: null, description: null, imageUrl: null,
    linkUrl: null, href: null, userId: null, sortOrder: 0, ...o,
  });

  it("mapea pregunta/respuesta en orden y descarta ítems incompletos", () => {
    const result = toFaqItems([
      item({ title: " ¿B? ", description: "b", sortOrder: 2 }),
      item({ title: "¿A?", description: "a", sortOrder: 1 }),
      item({ title: "¿Sin respuesta?", description: "  ", sortOrder: 3 }),
    ]);
    expect(result).toEqual([
      { question: "¿A?", answer: "a" },
      { question: "¿B?", answer: "b" },
    ]);
  });
});
