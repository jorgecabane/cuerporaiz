import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { auth } from "@/auth";
import { requireAdminCenterId } from "./require-admin";

const mockAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

beforeEach(() => vi.clearAllMocks());

describe("requireAdminCenterId", () => {
  it("devuelve el centerId si la sesión es de administración", async () => {
    mockAuth.mockResolvedValue({ user: { centerId: "c1", role: "ADMINISTRATOR" } });
    await expect(requireAdminCenterId()).resolves.toBe("c1");
  });

  it("redirige a /panel sin sesión", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireAdminCenterId()).rejects.toThrow("REDIRECT:/panel");
  });

  it("redirige a /panel si no es admin", async () => {
    mockAuth.mockResolvedValue({ user: { centerId: "c1", role: "STUDENT" } });
    await expect(requireAdminCenterId()).rejects.toThrow("REDIRECT:/panel");
  });

  it("redirige a /panel si no hay centro en la sesión", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMINISTRATOR" } });
    await expect(requireAdminCenterId()).rejects.toThrow("REDIRECT:/panel");
  });
});
