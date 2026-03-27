import { describe, it, expect } from "vitest";
import {
  minutesFromPolicyInput,
  defaultPolicyDisplay,
  formatMinutesAsShortSpanish,
  MAX_CANCEL_BEFORE_MINUTES,
  MAX_BOOK_BEFORE_MINUTES,
} from "./center-policy";
import type { PolicyTimeUnit } from "./center-policy";

describe("minutesFromPolicyInput", () => {
  it("converts minutes as-is", () => {
    expect(minutesFromPolicyInput(30, "minutes")).toBe(30);
  });

  it("converts hours to minutes", () => {
    expect(minutesFromPolicyInput(2, "hours")).toBe(120);
  });

  it("converts days to minutes", () => {
    expect(minutesFromPolicyInput(1, "days")).toBe(1440);
  });

  it("floors fractional values", () => {
    expect(minutesFromPolicyInput(2.7, "hours")).toBe(120);
  });

  it("returns 0 for negative values", () => {
    expect(minutesFromPolicyInput(-5, "hours")).toBe(0);
  });

  it("returns 0 for NaN", () => {
    expect(minutesFromPolicyInput(NaN, "hours")).toBe(0);
  });

  it("returns raw value for unknown unit (default branch)", () => {
    // Cast to bypass TypeScript to exercise the default switch branch
    expect(minutesFromPolicyInput(15, "weeks" as PolicyTimeUnit)).toBe(15);
  });
});

describe("defaultPolicyDisplay", () => {
  it("returns days when evenly divisible", () => {
    expect(defaultPolicyDisplay(1440)).toEqual({ value: 1, unit: "days" });
    expect(defaultPolicyDisplay(2880)).toEqual({ value: 2, unit: "days" });
  });

  it("returns hours when evenly divisible by 60", () => {
    expect(defaultPolicyDisplay(120)).toEqual({ value: 2, unit: "hours" });
  });

  it("returns minutes for non-even values", () => {
    expect(defaultPolicyDisplay(45)).toEqual({ value: 45, unit: "minutes" });
  });

  it("returns 0 hours for null/undefined/0", () => {
    expect(defaultPolicyDisplay(null)).toEqual({ value: 0, unit: "hours" });
    expect(defaultPolicyDisplay(undefined)).toEqual({ value: 0, unit: "hours" });
    expect(defaultPolicyDisplay(0)).toEqual({ value: 0, unit: "hours" });
  });

  it("returns 0 hours for negative", () => {
    expect(defaultPolicyDisplay(-10)).toEqual({ value: 0, unit: "hours" });
  });
});

describe("formatMinutesAsShortSpanish", () => {
  it("formats days", () => {
    expect(formatMinutesAsShortSpanish(1440)).toBe("1 día");
    expect(formatMinutesAsShortSpanish(2880)).toBe("2 días");
  });

  it("formats hours", () => {
    expect(formatMinutesAsShortSpanish(60)).toBe("1 hora");
    expect(formatMinutesAsShortSpanish(180)).toBe("3 horas");
  });

  it("formats minutes", () => {
    expect(formatMinutesAsShortSpanish(1)).toBe("1 minuto");
    expect(formatMinutesAsShortSpanish(45)).toBe("45 minutos");
  });

  it("handles 0 and null", () => {
    expect(formatMinutesAsShortSpanish(0)).toBe("0 minutos");
    expect(formatMinutesAsShortSpanish(null)).toBe("0 minutos");
    expect(formatMinutesAsShortSpanish(undefined)).toBe("0 minutos");
  });

  it("handles negative", () => {
    expect(formatMinutesAsShortSpanish(-5)).toBe("0 minutos");
  });
});

describe("constants", () => {
  it("MAX_CANCEL_BEFORE_MINUTES is 7 days", () => {
    expect(MAX_CANCEL_BEFORE_MINUTES).toBe(7 * 24 * 60);
  });

  it("MAX_BOOK_BEFORE_MINUTES is 30 days", () => {
    expect(MAX_BOOK_BEFORE_MINUTES).toBe(30 * 24 * 60);
  });
});
