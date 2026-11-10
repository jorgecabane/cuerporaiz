import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/adapters/db", () => ({ centerRepository: { findBySlug: vi.fn() } }));

import { centerRepository } from "@/lib/adapters/db";
import { getDefaultCenter } from "./default-center";

const findBySlug = vi.mocked(centerRepository.findBySlug);

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
});

describe("getDefaultCenter", () => {
  it("sin NEXT_PUBLIC_DEFAULT_CENTER_SLUG devuelve null sin ir a la base", async () => {
    await expect(getDefaultCenter()).resolves.toBeNull();
    expect(findBySlug).not.toHaveBeenCalled();
  });

  it("busca el centro por el slug configurado", async () => {
    process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG = "cuerporaiz";
    findBySlug.mockResolvedValue({ id: "c1", slug: "cuerporaiz" } as never);
    await expect(getDefaultCenter()).resolves.toMatchObject({ id: "c1" });
    expect(findBySlug).toHaveBeenCalledWith("cuerporaiz");
  });

  it("devuelve null si el slug no existe", async () => {
    process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG = "nope";
    findBySlug.mockResolvedValue(null);
    await expect(getDefaultCenter()).resolves.toBeNull();
  });
});
