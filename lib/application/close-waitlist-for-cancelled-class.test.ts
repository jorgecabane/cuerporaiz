import { describe, it, expect, vi, beforeEach } from "vitest";
import { closeWaitlistForCancelledClassUseCase } from "./close-waitlist-for-cancelled-class";

const mocks = vi.hoisted(() => ({
  liveClassRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
  waitlistRepository: { cancelActiveByLiveClassId: vi.fn() },
  sendEmailSafe: vi.fn(),
  getEmailBranding: vi.fn(),
}));

vi.mock("@/lib/adapters/db", () => ({
  liveClassRepository: mocks.liveClassRepository,
  userRepository: mocks.userRepository,
  waitlistRepository: mocks.waitlistRepository,
}));
vi.mock("@/lib/application/send-email", () => ({
  sendEmailSafe: mocks.sendEmailSafe,
}));
vi.mock("@/lib/email/branding", () => ({
  getEmailBranding: mocks.getEmailBranding,
}));

const branding = {
  centerId: "ctr_1",
  centerName: "Cuerpo Raíz",
  timezone: "America/Santiago",
  logoUrl: null,
  colorPrimary: "#000",
  colorSecondary: "#fff",
  contactEmail: null,
  contactPhone: null,
  contactAddress: "Sala 1",
  whatsappUrl: null,
  instagramUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEmailBranding.mockResolvedValue(branding);
});

describe("closeWaitlistForCancelledClassUseCase", () => {
  it("no hace nada si la clase no existe", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(null);
    await closeWaitlistForCancelledClassUseCase("lc_1");
    expect(mocks.waitlistRepository.cancelActiveByLiveClassId).not.toHaveBeenCalled();
  });

  it("cierra entries activas y envía correo de cancelación a cada usuario", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue({
      id: "lc_1",
      centerId: "ctr_1",
      title: "Vinyasa",
      startsAt: new Date("2026-05-15T19:00:00Z"),
      isOnline: false,
      meetingUrl: null,
    });
    mocks.waitlistRepository.cancelActiveByLiveClassId.mockResolvedValue([
      { id: "wl_1", userId: "u1" },
      { id: "wl_2", userId: "u2" },
    ]);
    mocks.userRepository.findById.mockImplementation(async (id: string) => ({
      id,
      email: `${id}@x.com`,
      name: id,
    }));
    await closeWaitlistForCancelledClassUseCase("lc_1");
    expect(mocks.waitlistRepository.cancelActiveByLiveClassId).toHaveBeenCalledWith("lc_1");
    expect(mocks.sendEmailSafe).toHaveBeenCalledTimes(2);
  });

  it("no envía si no hay entries activas", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue({
      id: "lc_1",
      centerId: "ctr_1",
      title: "Vinyasa",
      startsAt: new Date(),
      isOnline: false,
    });
    mocks.waitlistRepository.cancelActiveByLiveClassId.mockResolvedValue([]);
    await closeWaitlistForCancelledClassUseCase("lc_1");
    expect(mocks.sendEmailSafe).not.toHaveBeenCalled();
  });
});
