import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  computeDateRangeUtc,
  parsePaymentsSearchParams,
} from "./payments-query";

describe("payments-query", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("default type es checkout", () => {
    const parsed = parsePaymentsSearchParams({});
    expect(parsed.type).toBe("checkout");
    expect(parsed.page).toBe(1);
  });

  it("normaliza email (trim + lower)", () => {
    const parsed = parsePaymentsSearchParams({ email: "  Foo@Bar.com  " });
    expect(parsed.email).toBe("foo@bar.com");
  });

  it("page inválida vuelve a 1", () => {
    expect(parsePaymentsSearchParams({ page: "0" }).page).toBe(1);
    expect(parsePaymentsSearchParams({ page: "-3" }).page).toBe(1);
    expect(parsePaymentsSearchParams({ page: "abc" }).page).toBe(1);
  });

  it("page válida se parsea como int", () => {
    expect(parsePaymentsSearchParams({ page: "2" }).page).toBe(2);
    expect(parsePaymentsSearchParams({ page: "2.9" }).page).toBe(2);
  });

  it("preset today crea rango UTC del día", () => {
    const r = computeDateRangeUtc({ datePreset: "today" });
    expect(r).not.toBeNull();
    expect(r!.from.toISOString()).toBe("2026-03-17T00:00:00.000Z");
    expect(r!.to.toISOString()).toBe("2026-03-17T23:59:59.999Z");
  });

  it("preset last7 crea rango UTC de 7 días (incluye hoy)", () => {
    const r = computeDateRangeUtc({ datePreset: "last7" });
    expect(r).not.toBeNull();
    expect(r!.from.toISOString()).toBe("2026-03-11T00:00:00.000Z");
    expect(r!.to.toISOString()).toBe("2026-03-17T23:59:59.999Z");
  });

  it("preset thisMonth crea rango UTC del mes", () => {
    const r = computeDateRangeUtc({ datePreset: "thisMonth" });
    expect(r).not.toBeNull();
    expect(r!.from.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(r!.to.toISOString()).toBe("2026-03-31T23:59:59.999Z");
  });

  it("custom usa from/to", () => {
    const r = computeDateRangeUtc({
      datePreset: "custom",
      from: "2026-03-10",
      to: "2026-03-12",
    });
    expect(r).not.toBeNull();
    expect(r!.from.toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(r!.to.toISOString()).toBe("2026-03-12T23:59:59.999Z");
  });
});

