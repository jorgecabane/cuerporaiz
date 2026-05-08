import { describe, it, expect } from "vitest";
import { formatLongDateTime, formatLongDate, formatTime } from "./format-datetime";

const ISO_UTC = "2026-05-12T22:30:00Z"; // 18:30 en America/Santiago (UTC-4)

describe("formatLongDateTime", () => {
  it("formatea con TZ explícita", () => {
    const out = formatLongDateTime(ISO_UTC, "America/Santiago");
    expect(out).toContain("·");
    expect(out).toContain("18:30");
    expect(out.toLowerCase()).toContain("mayo");
  });

  it("acepta Date además de string", () => {
    const out = formatLongDateTime(new Date(ISO_UTC), "America/Santiago");
    expect(out).toContain("18:30");
  });

  it("usa default America/Santiago si no se pasa TZ", () => {
    const explicit = formatLongDateTime(ISO_UTC, "America/Santiago");
    const def = formatLongDateTime(ISO_UTC);
    expect(def).toBe(explicit);
  });

  it("respeta TZ distinta (UTC vs Santiago da horas distintas)", () => {
    const utc = formatLongDateTime(ISO_UTC, "UTC");
    const stgo = formatLongDateTime(ISO_UTC, "America/Santiago");
    expect(utc).toContain("22:30");
    expect(stgo).toContain("18:30");
  });
});

describe("formatLongDate", () => {
  it("formatea fecha completa con año", () => {
    const out = formatLongDate(ISO_UTC, "America/Santiago");
    expect(out).toContain("2026");
    expect(out.toLowerCase()).toContain("mayo");
    expect(out).toContain("12");
  });

  it("acepta Date además de string", () => {
    const out = formatLongDate(new Date(ISO_UTC), "America/Santiago");
    expect(out).toContain("2026");
  });

  it("usa default America/Santiago", () => {
    const explicit = formatLongDate(ISO_UTC, "America/Santiago");
    expect(formatLongDate(ISO_UTC)).toBe(explicit);
  });
});

describe("formatTime", () => {
  it("formatea hora 24h", () => {
    expect(formatTime(ISO_UTC, "America/Santiago")).toBe("18:30");
  });

  it("acepta Date", () => {
    expect(formatTime(new Date(ISO_UTC), "America/Santiago")).toBe("18:30");
  });

  it("usa default America/Santiago", () => {
    expect(formatTime(ISO_UTC)).toBe("18:30");
  });

  it("cambia con TZ", () => {
    expect(formatTime(ISO_UTC, "UTC")).toBe("22:30");
  });
});
