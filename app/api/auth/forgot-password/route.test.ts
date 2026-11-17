import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAttempt: vi.fn(async () => undefined),
}));

vi.mock("@/lib/adapters/db", () => ({
  loginAttemptRepository: { create: mocks.createAttempt },
  authTokenRepository: {},
  userRepository: {},
  centerRepository: {},
}));
vi.mock("@/lib/application/check-rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock("@/lib/application/request-password-reset", () => ({
  requestPasswordReset: vi.fn(async () => ({ token: null })),
}));

import { POST } from "./route";

describe("POST /api/auth/forgot-password", () => {
  it("guarda solo la IP del cliente, no la cadena de proxies de x-forwarded-for", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
        body: JSON.stringify({ email: "a@b.cl", centerId: "c1" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "203.0.113.7" })
    );
  });
});
