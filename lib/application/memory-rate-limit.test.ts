import { beforeEach, describe, expect, it } from "vitest";
import { memoryRateLimit, resetMemoryRateLimit } from "./memory-rate-limit";

describe("memoryRateLimit", () => {
  beforeEach(() => {
    resetMemoryRateLimit();
  });

  it("permite hasta `max` requests dentro de la ventana", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      const r = memoryRateLimit("user:1", 5, 60_000, now);
      expect(r.allowed).toBe(true);
    }
  });

  it("bloquea la request n+1 dentro de la ventana", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) memoryRateLimit("user:1", 5, 60_000, now);
    const blocked = memoryRateLimit("user:1", 5, 60_000, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("libera la ventana cuando pasa el tiempo", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) memoryRateLimit("user:1", 5, 60_000, t0);
    const afterWindow = memoryRateLimit("user:1", 5, 60_000, t0 + 61_000);
    expect(afterWindow.allowed).toBe(true);
  });

  it("buckets separados no se pisan", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) memoryRateLimit("user:1", 5, 60_000, now);
    const other = memoryRateLimit("user:2", 5, 60_000, now);
    expect(other.allowed).toBe(true);
  });
});
