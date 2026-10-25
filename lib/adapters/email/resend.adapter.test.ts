import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Resend falso con el mismo límite que la cuenta real: 10 requests por segundo.
const RATE_LIMIT_PER_SECOND = 10;
const sentAt: number[] = [];
const delivered: string[] = [];

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (payload: { to: string[] }) => {
        const now = Date.now();
        const lastSecond = sentAt.filter((t) => now - t < 1000).length;
        sentAt.push(now);
        if (lastSecond >= RATE_LIMIT_PER_SECOND) {
          return { data: null, error: { name: "rate_limit_exceeded", message: "Too many requests" } };
        }
        delivered.push(payload.to[0]);
        return { data: { id: `id-${payload.to[0]}` }, error: null };
      },
    };
  },
}));

const dto = (to: string) => ({ from: "a@b.cl", to: [to], subject: "s", html: "<p>h</p>" });

describe("resendEmailAdapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    sentAt.length = 0;
    delivered.length = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("una ráfaga de 25 envíos simultáneos llega completa pese al límite de 10/s", async () => {
    const { resendEmailAdapter } = await import("./resend.adapter");
    const all = Promise.all(Array.from({ length: 25 }, (_, i) => resendEmailAdapter.send(dto(`u${i}@x.cl`))));
    await vi.runAllTimersAsync();
    const results = await all;

    expect(results.every((r) => r.success)).toBe(true);
    expect(delivered).toHaveLength(25);
  });

  it("si Resend igual responde rate_limit_exceeded (otra instancia), reintenta", async () => {
    const { resendEmailAdapter } = await import("./resend.adapter");
    // Otra instancia ya gastó el cupo de este segundo.
    for (let i = 0; i < RATE_LIMIT_PER_SECOND; i++) sentAt.push(Date.now());
    const pending = resendEmailAdapter.send(dto("tarde@x.cl"));
    await vi.runAllTimersAsync();

    expect(await pending).toEqual({ success: true, id: "id-tarde@x.cl" });
  });
});
