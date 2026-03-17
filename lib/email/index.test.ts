import { describe, it, expect } from "vitest";
import { buildGoogleCalendarUrl, getAddToCalendarInstruction } from ".";

describe("lib/email index", () => {
  it("re-exporta helpers de calendario", () => {
    expect(typeof buildGoogleCalendarUrl).toBe("function");
    expect(typeof getAddToCalendarInstruction).toBe("function");
  });
});

