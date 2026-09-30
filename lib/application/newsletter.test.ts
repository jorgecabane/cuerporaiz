import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  newsletterSubscriberRepository: { subscribe: vi.fn(), unsubscribe: vi.fn() },
  emailPreferenceRepository: { upsert: vi.fn() },
  userRepository: { findByEmail: vi.fn(), findMembership: vi.fn() },
}));
vi.mock("@/lib/adapters/db", () => mocks);

import { subscribeToNewsletter, unsubscribeFromNewsletter } from "./newsletter";

describe("newsletter use cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("suscribe normalizando el email; visitante sin cuenta no toca preferencias", async () => {
    mocks.userRepository.findByEmail.mockResolvedValue(null);
    await subscribeToNewsletter("c1", "  Ana@Correo.CL ");
    expect(mocks.newsletterSubscriberRepository.subscribe).toHaveBeenCalledWith("c1", "ana@correo.cl");
    expect(mocks.emailPreferenceRepository.upsert).not.toHaveBeenCalled();
  });

  it("si el email es alumno del centro, sincroniza su switch del blog", async () => {
    mocks.userRepository.findByEmail.mockResolvedValue({ id: "u1" });
    mocks.userRepository.findMembership.mockResolvedValue({ role: "STUDENT", isLegacyClient: false });
    await unsubscribeFromNewsletter("c1", "ana@correo.cl");
    expect(mocks.newsletterSubscriberRepository.unsubscribe).toHaveBeenCalledWith("c1", "ana@correo.cl");
    expect(mocks.emailPreferenceRepository.upsert).toHaveBeenCalledWith({ userId: "u1", centerId: "c1", blogPublished: false });

    await subscribeToNewsletter("c1", "ana@correo.cl");
    expect(mocks.emailPreferenceRepository.upsert).toHaveBeenLastCalledWith({ userId: "u1", centerId: "c1", blogPublished: true });
  });

  it("usuario de otro centro: no toca preferencias", async () => {
    mocks.userRepository.findByEmail.mockResolvedValue({ id: "u2" });
    mocks.userRepository.findMembership.mockResolvedValue(null);
    await unsubscribeFromNewsletter("c1", "x@correo.cl");
    expect(mocks.emailPreferenceRepository.upsert).not.toHaveBeenCalled();
  });
});
