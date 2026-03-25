import { describe, it, expect } from "vitest";
import { parseHolidayDateInput, holidayCalendarKey, formatHolidayDateDisplay } from "./holiday-date";

describe("parseHolidayDateInput", () => {
  it("parses a valid date string to UTC midnight", () => {
    const d = parseHolidayDateInput("2026-01-15");
    expect(d.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("returns invalid date for empty/malformed input", () => {
    expect(parseHolidayDateInput("").getTime()).toBeNaN();
    expect(parseHolidayDateInput("abc").getTime()).toBeNaN();
  });

  it("trims whitespace", () => {
    const d = parseHolidayDateInput("  2026-03-01  ");
    expect(d.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});

describe("holidayCalendarKey", () => {
  it("returns YYYY-MM-DD from a UTC date", () => {
    const d = new Date("2026-12-25T00:00:00.000Z");
    expect(holidayCalendarKey(d)).toBe("2026-12-25");
  });
});

describe("formatHolidayDateDisplay", () => {
  it("returns a Spanish formatted date", () => {
    const d = new Date("2026-01-01T00:00:00.000Z");
    const result = formatHolidayDateDisplay(d);
    expect(result).toContain("2026");
    expect(result).toContain("enero");
  });
});
