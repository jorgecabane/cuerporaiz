import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyWaitlistOnSpotFreed } from "./notify-waitlist-on-spot-freed";

const mocks = vi.hoisted(() => ({
  centerRepository: {
    findById: vi.fn(),
  },
  liveClassRepository: {
    findById: vi.fn(),
    countConfirmedReservations: vi.fn(),
  },
  eventRepository: {
    findById: vi.fn(),
  },
  eventTicketRepository: {
    countPaidByEventId: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
  },
  waitlistRepository: {
    findActiveByItem: vi.fn(),
    markNotified: vi.fn(),
    countActiveHoldsByEventId: vi.fn(),
    expireEventHolds: vi.fn(),
    cancelActiveByLiveClassId: vi.fn(),
  },
  sendEmailSafe: vi.fn(),
  getEmailBranding: vi.fn(),
  getBaseUrl: vi.fn(() => "https://app.example.com"),
  emailPreferenceRepository: {
    isEnabled: vi.fn(async (_userId: string, _centerId: string, _type: string) => true),
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: mocks.centerRepository,
  liveClassRepository: mocks.liveClassRepository,
  eventRepository: mocks.eventRepository,
  eventTicketRepository: mocks.eventTicketRepository,
  userRepository: mocks.userRepository,
  waitlistRepository: mocks.waitlistRepository,
  emailPreferenceRepository: mocks.emailPreferenceRepository,
}));

vi.mock("@/lib/application/send-email", () => ({
  sendEmailSafe: mocks.sendEmailSafe,
}));

vi.mock("@/lib/email/branding", () => ({
  getEmailBranding: mocks.getEmailBranding,
}));

vi.mock("@/lib/utils/base-url", () => ({
  getBaseUrl: mocks.getBaseUrl,
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
  mocks.emailPreferenceRepository.isEnabled.mockImplementation(async () => true);
  mocks.getEmailBranding.mockResolvedValue(branding);
  mocks.centerRepository.findById.mockResolvedValue({
    id: "ctr_1",
    notifyWhenSlotFreed: true,
    bookBeforeMinutes: 60,
  });
});

describe("notifyWaitlistOnSpotFreed — clase", () => {
  function makeClass(overrides: Record<string, unknown> = {}) {
    return {
      id: "lc_1",
      centerId: "ctr_1",
      title: "Vinyasa",
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      durationMinutes: 60,
      maxCapacity: 10,
      isOnline: false,
      meetingUrl: null,
      status: "ACTIVE",
      ...overrides,
    };
  }

  it("no envía si la clase no existe", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(null);
    await notifyWaitlistOnSpotFreed("class", "lc_1");
    expect(mocks.sendEmailSafe).not.toHaveBeenCalled();
  });

  it("no envía si el centro tiene notifyWhenSlotFreed=false", async () => {
    mocks.centerRepository.findById.mockResolvedValue({
      id: "ctr_1",
      notifyWhenSlotFreed: false,
      bookBeforeMinutes: 60,
    });
    mocks.liveClassRepository.findById.mockResolvedValue(makeClass());
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    mocks.waitlistRepository.findActiveByItem.mockResolvedValue([
      { id: "wl_1", userId: "u1", notifiedAt: null, position: 1 },
    ]);
    mocks.userRepository.findById.mockResolvedValue({ id: "u1", email: "u1@x.com" });
    await notifyWaitlistOnSpotFreed("class", "lc_1");
    expect(mocks.sendEmailSafe).not.toHaveBeenCalled();
  });

  it("no envía si la ventana bookBeforeMinutes ya cerró", async () => {
    // 30 min antes vs bookBeforeMinutes=60
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeClass({ startsAt: new Date(Date.now() + 30 * 60 * 1000) })
    );
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    await notifyWaitlistOnSpotFreed("class", "lc_1");
    expect(mocks.sendEmailSafe).not.toHaveBeenCalled();
  });

  it("no envía si la clase ya está llena de nuevo (alguien llenó el cupo)", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeClass({ maxCapacity: 5 }));
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    await notifyWaitlistOnSpotFreed("class", "lc_1");
    expect(mocks.sendEmailSafe).not.toHaveBeenCalled();
  });

  it("envía a TODAS las entries activas no throttleadas (broadcast)", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeClass({ maxCapacity: 10 }));
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    mocks.waitlistRepository.findActiveByItem.mockResolvedValue([
      { id: "wl_1", userId: "u1", notifiedAt: null, position: 1 },
      { id: "wl_2", userId: "u2", notifiedAt: null, position: 2 },
      { id: "wl_3", userId: "u3", notifiedAt: null, position: 3 },
    ]);
    mocks.userRepository.findById.mockImplementation(async (id: string) => ({
      id,
      email: `${id}@x.com`,
      name: id,
    }));
    await notifyWaitlistOnSpotFreed("class", "lc_1");
    expect(mocks.sendEmailSafe).toHaveBeenCalledTimes(3);
    expect(mocks.waitlistRepository.markNotified).toHaveBeenCalledTimes(3);
  });

  it("respeta throttle de 10 min (no notifica a quien recibió correo hace 5 min)", async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    mocks.liveClassRepository.findById.mockResolvedValue(makeClass({ maxCapacity: 10 }));
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    mocks.waitlistRepository.findActiveByItem.mockResolvedValue([
      { id: "wl_1", userId: "u1", notifiedAt: fiveMinAgo, position: 1 },
      { id: "wl_2", userId: "u2", notifiedAt: null, position: 2 },
    ]);
    mocks.userRepository.findById.mockImplementation(async (id: string) => ({
      id,
      email: `${id}@x.com`,
    }));
    await notifyWaitlistOnSpotFreed("class", "lc_1");
    expect(mocks.sendEmailSafe).toHaveBeenCalledTimes(1);
    expect(mocks.waitlistRepository.markNotified).toHaveBeenCalledWith(
      "wl_2",
      expect.any(Date)
    );
  });

  it("respeta el switch spotFreed por usuario (no envía ni marca a quien lo apagó)", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeClass({ maxCapacity: 10 }));
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    mocks.waitlistRepository.findActiveByItem.mockResolvedValue([
      { id: "wl_1", userId: "u1", notifiedAt: null, position: 1 },
      { id: "wl_2", userId: "u2", notifiedAt: null, position: 2 },
    ]);
    mocks.userRepository.findById.mockImplementation(async (id: string) => ({
      id,
      email: `${id}@x.com`,
    }));
    // u1 apagó el switch; u2 lo mantiene encendido.
    mocks.emailPreferenceRepository.isEnabled.mockImplementation(
      async (userId: string) => userId !== "u1"
    );
    await notifyWaitlistOnSpotFreed("class", "lc_1");
    expect(mocks.sendEmailSafe).toHaveBeenCalledTimes(1);
    expect(mocks.waitlistRepository.markNotified).toHaveBeenCalledTimes(1);
    expect(mocks.waitlistRepository.markNotified).toHaveBeenCalledWith("wl_2", expect.any(Date));
  });

  it("continúa si un usuario falla (no aborta el batch)", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeClass({ maxCapacity: 10 }));
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    mocks.waitlistRepository.findActiveByItem.mockResolvedValue([
      { id: "wl_1", userId: "u1", notifiedAt: null, position: 1 },
      { id: "wl_2", userId: "u2", notifiedAt: null, position: 2 },
    ]);
    mocks.userRepository.findById
      .mockResolvedValueOnce(null) // user 1 no existe
      .mockResolvedValueOnce({ id: "u2", email: "u2@x.com" });
    await notifyWaitlistOnSpotFreed("class", "lc_1");
    expect(mocks.sendEmailSafe).toHaveBeenCalledTimes(1);
    expect(mocks.waitlistRepository.markNotified).toHaveBeenCalledTimes(1);
  });
});

describe("notifyWaitlistOnSpotFreed — evento", () => {
  function makeEvent(overrides: Record<string, unknown> = {}) {
    return {
      id: "ev_1",
      centerId: "ctr_1",
      title: "Retiro",
      description: null,
      location: "Centro",
      startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
      amountCents: 50000,
      currency: "CLP",
      maxCapacity: 10,
      status: "PUBLISHED",
      ...overrides,
    };
  }

  it("primero ejecuta releaseExpiredEventHolds (lazy)", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent());
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(10); // ya lleno post-expire
    mocks.waitlistRepository.countActiveHoldsByEventId.mockResolvedValue(0);
    await notifyWaitlistOnSpotFreed("event", "ev_1");
    expect(mocks.waitlistRepository.expireEventHolds).toHaveBeenCalledWith(
      "ev_1",
      expect.any(Date)
    );
  });

  it("envía con CTA 'Ir al pago' para eventos", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ maxCapacity: 10 }));
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(5);
    mocks.waitlistRepository.countActiveHoldsByEventId.mockResolvedValue(2);
    mocks.waitlistRepository.findActiveByItem.mockResolvedValue([
      { id: "wl_1", userId: "u1", notifiedAt: null, position: 1 },
    ]);
    mocks.userRepository.findById.mockResolvedValue({ id: "u1", email: "u1@x.com" });
    await notifyWaitlistOnSpotFreed("event", "ev_1");
    expect(mocks.sendEmailSafe).toHaveBeenCalledTimes(1);
    const dto = mocks.sendEmailSafe.mock.calls[0][0];
    expect(dto.html).toContain("Ir al pago");
  });
});
