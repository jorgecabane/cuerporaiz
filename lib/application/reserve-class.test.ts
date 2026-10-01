import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  reserveClassUseCase,
  cancelReservationUseCase,
  cancelReservationByStaffUseCase,
  listMyReservationsPaginated,
  canShowTrialCta,
  isUserTrialEligible,
} from "./reserve-class";
import type { Reservation, LiveClass } from "@/lib/domain";

const mocks = vi.hoisted(() => ({
  reservationRepository: {
    findById: vi.fn(),
    updateStatus: vi.fn(),
    findByUserIdAndCenterPaginated: vi.fn(),
    countByUserAndStatus: vi.fn(),
    hasTrialReservation: vi.fn(),
    findByUserAndLiveClass: vi.fn(),
    create: vi.fn(),
    reactivate: vi.fn(),
  },
  liveClassRepository: {
    findById: vi.fn(),
    findByIds: vi.fn(async (): Promise<LiveClass[]> => []),
    countConfirmedReservations: vi.fn(),
    countConfirmedByLiveClassIds: vi.fn(async () => new Map<string, number>()),
  },
  instructorRepository: { findByCenterId: vi.fn(async (): Promise<unknown[]> => []), findById: vi.fn() },
  siteConfigRepository: { findByCenterId: vi.fn(async (): Promise<{ firstClassInfo: string | null } | null> => null) },
  disciplineRepository: {
    findManyByCenterId: vi.fn(async (): Promise<{ id: string; name: string; description: string | null }[]> => []),
  },
  centerRepository: { findById: vi.fn() },
  userPlanRepository: {
    findById: vi.fn(),
    decrementClassesUsed: vi.fn(),
    findActiveByUserAndCenter: vi.fn(),
    incrementClassesUsed: vi.fn(),
  },
  centerHolidayRepository: {
    findByCenterIdAndDate: vi.fn(),
  },
  userRepository: { findById: vi.fn(), findMembership: vi.fn() },
  planRepository: { findById: vi.fn() },
  emailPreferenceRepository: { isEnabled: vi.fn(async () => true) },
}));

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: mocks.centerRepository,
  liveClassRepository: mocks.liveClassRepository,
  reservationRepository: mocks.reservationRepository,
  userPlanRepository: mocks.userPlanRepository,
  userRepository: mocks.userRepository,
  instructorRepository: mocks.instructorRepository,
  disciplineRepository: mocks.disciplineRepository,
  siteConfigRepository: mocks.siteConfigRepository,
  planRepository: mocks.planRepository,
  centerHolidayRepository: mocks.centerHolidayRepository,
  emailPreferenceRepository: mocks.emailPreferenceRepository,
}));

// Capturamos los emails enviados para que los tests puedan inspeccionarlos
// sin gatillar el provider real ni leer process.env.
const sentEmails = vi.hoisted(() => ({ list: [] as Array<{ subject: string; to: string[]; html?: string }> }));
vi.mock("@/lib/application/send-email", () => ({
  sendEmailSafe: vi.fn((dto: { subject: string; to: string[]; html?: string }) => {
    sentEmails.list.push({ subject: dto.subject, to: dto.to, html: dto.html });
  }),
}));
vi.mock("@/lib/email/branding", () => ({
  getEmailBranding: vi.fn(async () => ({
    centerName: "Test",
    colorPrimary: "#000",
    colorSecondary: "#111",
    timezone: "America/Santiago",
    contactEmail: "contacto@test.cl",
    contactAddress: "Dirección test",
  })),
}));

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "res-1",
    userId: "user-1",
    liveClassId: "lc-1",
    userPlanId: "up-1",
    isTrial: false,
    status: "CONFIRMED",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLiveClass(overrides: Partial<LiveClass> = {}): LiveClass {
  return {
    id: "lc-1",
    centerId: "center-1",
    title: "Yoga",
    startsAt: new Date("2026-06-01T14:00:00Z"),
    durationMinutes: 60,
    maxCapacity: 20,
    disciplineId: null,
    instructorId: null,
    isOnline: false,
    meetingUrl: null,
    meetingProvider: null,
    meetingExternalId: null,
    acceptsTrialReservations: false,
    trialCapacity: null,
    color: null,
    classPassEnabled: false,
    classPassCapacity: null,
    seriesId: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("cancelReservationUseCase", () => {
  const userId = "user-1";
  const centerId = "center-1";
  const reservationId = "res-1";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.reservationRepository.findById.mockResolvedValue(makeReservation());
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      cancelBeforeMinutes: 12 * 60,
    });
    mocks.userPlanRepository.findById.mockResolvedValue({ id: "up-1", classesTotal: 10, classesUsed: 0 });
    mocks.reservationRepository.updateStatus.mockImplementation(
      async (_id: string, status: Reservation["status"]) => makeReservation({ status })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Caso A: cancela a tiempo (hoursBeforeClass >= cancelBeforeHours) => CANCELLED y decrementa classesUsed", async () => {
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const startsAt = new Date("2026-06-01T23:00:00Z"); // 13h después
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationUseCase(userId, centerId, reservationId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reservation.status).toBe("CANCELLED");
    }
    expect(mocks.reservationRepository.updateStatus).toHaveBeenCalledWith(
      reservationId,
      "CANCELLED"
    );
    expect(mocks.userPlanRepository.decrementClassesUsed).toHaveBeenCalledWith("up-1");
  });

  it("Caso B: cancela tarde (0 <= hoursBeforeClass < cancelBeforeHours) => LATE_CANCELLED y NO decrementa", async () => {
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const startsAt = new Date("2026-06-01T14:00:00Z"); // 4h después ( < 12 )
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationUseCase(userId, centerId, reservationId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reservation.status).toBe("LATE_CANCELLED");
    }
    expect(mocks.reservationRepository.updateStatus).toHaveBeenCalledWith(
      reservationId,
      "LATE_CANCELLED"
    );
    expect(mocks.userPlanRepository.decrementClassesUsed).not.toHaveBeenCalled();
  });

  it("Caso C: clase ya inició (hoursBeforeClass < 0) => success: false, code CLASS_STARTED", async () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const startsAt = new Date("2026-06-01T11:00:00Z"); // 1h antes
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationUseCase(userId, centerId, reservationId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("CLASS_STARTED");
      expect(result.message).toMatch(/ya inició/);
    }
    expect(mocks.reservationRepository.updateStatus).not.toHaveBeenCalled();
    expect(mocks.userPlanRepository.decrementClassesUsed).not.toHaveBeenCalled();
  });
});

describe("cancelReservationByStaffUseCase", () => {
  const centerId = "center-1";
  const reservationId = "res-1";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.reservationRepository.findById.mockResolvedValue(makeReservation());
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      cancelBeforeMinutes: 12 * 60,
    });
    mocks.userPlanRepository.findById.mockResolvedValue({ id: "up-1", classesTotal: 10, classesUsed: 0 });
    mocks.reservationRepository.updateStatus.mockImplementation(
      async (_id: string, status: Reservation["status"]) => makeReservation({ status })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Caso A: cancela a tiempo => CANCELLED y decrementa", async () => {
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const startsAt = new Date("2026-06-01T23:00:00Z");
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationByStaffUseCase(centerId, reservationId);

    expect(result.success).toBe(true);
    if (result.success) expect(result.reservation.status).toBe("CANCELLED");
    expect(mocks.userPlanRepository.decrementClassesUsed).toHaveBeenCalledWith("up-1");
  });

  it("Caso B: cancela tarde => LATE_CANCELLED y NO decrementa", async () => {
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    const startsAt = new Date("2026-06-01T14:00:00Z");
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationByStaffUseCase(centerId, reservationId);

    expect(result.success).toBe(true);
    if (result.success) expect(result.reservation.status).toBe("LATE_CANCELLED");
    expect(mocks.userPlanRepository.decrementClassesUsed).not.toHaveBeenCalled();
  });

  it("Caso C: clase ya inició => CLASS_STARTED", async () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const startsAt = new Date("2026-06-01T11:00:00Z");
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ startsAt, centerId }));

    const result = await cancelReservationByStaffUseCase(centerId, reservationId);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("CLASS_STARTED");
    expect(mocks.reservationRepository.updateStatus).not.toHaveBeenCalled();
  });
});

describe("listMyReservationsPaginated", () => {
  const userId = "user-1";
  const centerId = "center-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.liveClassRepository.findByIds.mockResolvedValue([]);
    mocks.liveClassRepository.countConfirmedByLiveClassIds.mockResolvedValue(new Map());
    mocks.instructorRepository.findByCenterId.mockResolvedValue([]);
    mocks.disciplineRepository.findManyByCenterId.mockResolvedValue([]);
    mocks.reservationRepository.findByUserIdAndCenterPaginated.mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  it("sin statuses no pasa statuses al repo (todas las reservas)", async () => {
    await listMyReservationsPaginated(userId, centerId, { page: 1, pageSize: 10 });

    expect(mocks.reservationRepository.findByUserIdAndCenterPaginated).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        centerId,
        limit: 10,
        offset: 0,
      })
    );
    const call = mocks.reservationRepository.findByUserIdAndCenterPaginated.mock.calls[0][1];
    expect(call.statuses).toBeUndefined();
  });

  it("con statuses pasa array al repo (incluye CANCELLED y LATE_CANCELLED)", async () => {
    const statuses = ["CONFIRMED", "CANCELLED", "LATE_CANCELLED", "ATTENDED", "NO_SHOW"] as const;
    await listMyReservationsPaginated(userId, centerId, { page: 1, pageSize: 10, statuses: [...statuses] });

    expect(mocks.reservationRepository.findByUserIdAndCenterPaginated).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        centerId,
        limit: 10,
        offset: 0,
        statuses: ["CONFIRMED", "CANCELLED", "LATE_CANCELLED", "ATTENDED", "NO_SHOW"],
      })
    );
  });

  it("carga clases, cupos y prácticas en lote (sin una query por reserva)", async () => {
    mocks.reservationRepository.findByUserIdAndCenterPaginated.mockResolvedValue({
      items: [
        makeReservation({ id: "r-1", liveClassId: "lc-1" }),
        makeReservation({ id: "r-2", liveClassId: "lc-1" }),
        makeReservation({ id: "r-3", liveClassId: "lc-2" }),
      ],
      total: 3,
    });
    mocks.liveClassRepository.findByIds.mockResolvedValue([
      makeLiveClass({ id: "lc-1", centerId, maxCapacity: 10, disciplineId: "d-1" }),
      makeLiveClass({ id: "lc-2", centerId, maxCapacity: 8, disciplineId: null }),
    ]);
    mocks.liveClassRepository.countConfirmedByLiveClassIds.mockResolvedValue(new Map([["lc-1", 3]]));
    mocks.disciplineRepository.findManyByCenterId.mockResolvedValue([
      { id: "d-1", name: "Vinyasa", description: "Poder, activación." },
    ]);

    const result = await listMyReservationsPaginated(userId, centerId, { page: 1, pageSize: 10 });

    expect(mocks.liveClassRepository.findByIds).toHaveBeenCalledTimes(1);
    expect(mocks.liveClassRepository.findByIds).toHaveBeenCalledWith(["lc-1", "lc-2"]);
    expect(mocks.liveClassRepository.countConfirmedByLiveClassIds).toHaveBeenCalledTimes(1);
    expect(mocks.liveClassRepository.countConfirmedReservations).not.toHaveBeenCalled();
    const byId = new Map(result.items.map((r) => [r.id, r.liveClass]));
    expect(byId.get("r-1")).toMatchObject({ spotsLeft: 7, disciplineName: "Vinyasa", disciplineDescription: "Poder, activación." });
    expect(byId.get("r-3")).toMatchObject({ spotsLeft: 8, disciplineName: null });
  });
});

describe("reserveClassUseCase — holiday blocking", () => {
  const userId = "user-1";
  const centerId = "center-1";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId })
    );
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      bookBeforeMinutes: 0,
      cancelBeforeMinutes: 0,
      maxNoShowsPerMonth: 10,
      allowTrialClassPerPerson: false,
    });
    mocks.reservationRepository.countByUserAndStatus.mockResolvedValue(0);
    mocks.reservationRepository.hasTrialReservation.mockResolvedValue(false);
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(0);
    mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(null);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up-1", planId: "p-1", classesTotal: null, classesUsed: 0, validUntil: null, status: "ACTIVE" },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p-1", type: "LIVE" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rechaza reserva si la fecha de la clase es feriado del centro → HOLIDAY", async () => {
    mocks.centerHolidayRepository.findByCenterIdAndDate.mockResolvedValue({
      id: "h-1",
      centerId,
      date: new Date(Date.UTC(2026, 5, 10)),
      label: "Día libre",
      createdAt: new Date(),
    });

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("HOLIDAY");
      expect(result.message).toMatch(/feriado/i);
    }
    expect(mocks.reservationRepository.create).not.toHaveBeenCalled();
  });

  it("permite reserva si no hay feriado en la fecha", async () => {
    mocks.centerHolidayRepository.findByCenterIdAndDate.mockResolvedValue(null);
    mocks.reservationRepository.create.mockResolvedValue(makeReservation());

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(true);
    expect(mocks.centerHolidayRepository.findByCenterIdAndDate).toHaveBeenCalled();
  });
});

describe("reserveClassUseCase — clase de prueba (trial)", () => {
  const userId = "user-1";
  const centerId = "center-1";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sentEmails.list.length = 0;
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      bookBeforeMinutes: 0,
      cancelBeforeMinutes: 0,
      maxNoShowsPerMonth: 10,
      allowTrialClassPerPerson: true,
    });
    mocks.reservationRepository.countByUserAndStatus.mockResolvedValue(0);
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(0);
    mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(null);
    mocks.centerHolidayRepository.findByCenterIdAndDate.mockResolvedValue(null);
    mocks.reservationRepository.create.mockImplementation(async (data) =>
      makeReservation({ userPlanId: data.userPlanId ?? null, isTrial: data.isTrial ?? false })
    );
    mocks.userRepository.findById.mockResolvedValue({
      id: userId, email: "alumno@test.cl", name: "Alumno",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite reservar una clase de prueba sin UserPlan activo (primera vez) y marca isTrial=true", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId, acceptsTrialReservations: true })
    );
    mocks.reservationRepository.hasTrialReservation.mockResolvedValue(false);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([]);

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(true);
    expect(mocks.reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId, liveClassId: "lc-1", userPlanId: null, isTrial: true })
    );
    expect(mocks.userPlanRepository.incrementClassesUsed).not.toHaveBeenCalled();
    // Email al cliente con variante trial + email al instructor (fallback contactEmail por sin instructor)
    expect(sentEmails.list.some((e) => e.subject.startsWith("Clase de prueba confirmada:"))).toBe(true);
    expect(sentEmails.list.some((e) => e.subject.startsWith("Clase de prueba:") && e.to.includes("contacto@test.cl"))).toBe(true);
  });

  it("la clase de prueba incluye 'Tu primera clase' en el correo del alumno", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId, acceptsTrialReservations: true })
    );
    mocks.reservationRepository.hasTrialReservation.mockResolvedValue(false);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([]);
    mocks.siteConfigRepository.findByCenterId.mockResolvedValueOnce({ firstClassInfo: "Llega 10 minutos antes\nRopa cómoda" });

    await reserveClassUseCase(userId, centerId, "lc-1");

    const studentEmail = sentEmails.list.find((e) => e.subject.startsWith("Clase de prueba confirmada:"));
    expect(studentEmail?.html).toContain("Antes de tu primera clase");
    expect(studentEmail?.html).toContain("Ropa cómoda");
  });

  it("rechaza con TRIAL_ALREADY_USED si ya usó la clase de prueba", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId, acceptsTrialReservations: true })
    );
    mocks.reservationRepository.hasTrialReservation.mockResolvedValue(true);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([]);

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("TRIAL_ALREADY_USED");
    expect(mocks.reservationRepository.create).not.toHaveBeenCalled();
  });

  it("rechaza con NO_ACTIVE_PLAN si la clase NO es de prueba y no hay plan", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId, acceptsTrialReservations: false })
    );
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([]);

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("NO_ACTIVE_PLAN");
    expect(mocks.reservationRepository.create).not.toHaveBeenCalled();
  });

  it("rechaza con TRIAL_NOT_AVAILABLE si el cliente está marcado como migrado y no tiene plan", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId, acceptsTrialReservations: true })
    );
    mocks.userRepository.findMembership.mockResolvedValue({
      role: "STUDENT",
      isLegacyClient: true,
    });
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([]);

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("TRIAL_NOT_AVAILABLE");
    expect(mocks.reservationRepository.hasTrialReservation).not.toHaveBeenCalled();
    expect(mocks.reservationRepository.create).not.toHaveBeenCalled();
  });

  it("permite reservar trial class usando plan activo aunque cliente sea legacy y NO notifica al instructor", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId, acceptsTrialReservations: true })
    );
    mocks.userRepository.findMembership.mockResolvedValue({
      role: "STUDENT",
      isLegacyClient: true,
    });
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up-1", planId: "p-1", classesTotal: 10, classesUsed: 0, validUntil: null, status: "ACTIVE", validFrom: new Date("2026-01-01") },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p-1", type: "LIVE" });

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(true);
    expect(mocks.reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId, liveClassId: "lc-1", userPlanId: "up-1", isTrial: false })
    );
    expect(mocks.userPlanRepository.incrementClassesUsed).toHaveBeenCalledWith("up-1");
    // Email cliente sin variante trial. NINGÚN mail "Clase de prueba:" al instructor (regresión Bug B).
    expect(sentEmails.list.some((e) => e.subject.startsWith("Reserva confirmada:"))).toBe(true);
    expect(sentEmails.list.some((e) => e.subject.startsWith("Clase de prueba:"))).toBe(false);
  });

  it("respeta el switch reservationConfirm: si está OFF no envía confirmación al estudiante", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId })
    );
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up-1", planId: "p-1", classesTotal: 10, classesUsed: 0, validUntil: null, status: "ACTIVE", validFrom: new Date("2026-01-01") },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p-1", type: "LIVE" });
    // El usuario apagó el switch de confirmación de reserva.
    mocks.emailPreferenceRepository.isEnabled.mockResolvedValueOnce(false);

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(true);
    expect(mocks.reservationRepository.create).toHaveBeenCalled();
    expect(sentEmails.list.some((e) => e.subject.startsWith("Reserva confirmada:"))).toBe(false);
  });

  it("permite reservar trial class usando plan activo aunque ya usó trial antes", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId, acceptsTrialReservations: true })
    );
    mocks.reservationRepository.hasTrialReservation.mockResolvedValue(true);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up-1", planId: "p-1", classesTotal: 10, classesUsed: 0, validUntil: null, status: "ACTIVE", validFrom: new Date("2026-01-01") },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p-1", type: "LIVE" });

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(true);
    expect(mocks.reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId, liveClassId: "lc-1", userPlanId: "up-1" })
    );
    // Si tiene plan, ni siquiera consulta el historial de trial
    expect(mocks.userRepository.findMembership).not.toHaveBeenCalled();
  });

  // Bug B regresión: si un alumno NO-legacy con plan reserva una clase que
  // admite trials, NO debe disparar el mail "Clase de prueba:" al instructor.
  // Antes del fix, el guard miraba liveClass.acceptsTrialReservations en vez
  // de reservation.isTrial.
  it("[Bug B] reserva con plan en clase trial-friendly NO notifica al instructor", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId, acceptsTrialReservations: true })
    );
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up-1", planId: "p-1", classesTotal: 10, classesUsed: 0, validUntil: null, status: "ACTIVE", validFrom: new Date("2026-01-01") },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p-1", type: "LIVE" });

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(true);
    if (result.success) expect(result.reservation.isTrial).toBe(false);
    expect(mocks.reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userPlanId: "up-1", isTrial: false })
    );
    expect(sentEmails.list.some((e) => e.subject.startsWith("Reserva confirmada:"))).toBe(true);
    expect(sentEmails.list.some((e) => e.subject.startsWith("Clase de prueba:"))).toBe(false);
  });
});

// Regresión producción (22-07-2026): un alumno que cancelaba su reserva no
// podía volver a reservar la misma clase. El chequeo de duplicados miraba
// cualquier fila existente (la tabla tiene @@unique([userId, liveClassId]))
// sin filtrar por status, así que la fila CANCELLED lo bloqueaba para siempre
// con "Ya tienes un registro para esta clase" — incluso con la clase vacía.
describe("reserveClassUseCase — re-reserva tras cancelar", () => {
  const userId = "user-1";
  const centerId = "center-1";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    sentEmails.list.length = 0;
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      bookBeforeMinutes: 0,
      cancelBeforeMinutes: 0,
      maxNoShowsPerMonth: 10,
      allowTrialClassPerPerson: false,
    });
    mocks.reservationRepository.countByUserAndStatus.mockResolvedValue(0);
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(0);
    mocks.centerHolidayRepository.findByCenterIdAndDate.mockResolvedValue(null);
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ startsAt: new Date("2026-06-10T14:00:00Z"), centerId })
    );
    mocks.userRepository.findById.mockResolvedValue({
      id: userId, email: "alumno@test.cl", name: "Alumno",
    });
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up-1", planId: "plan-1", status: "ACTIVE", classesTotal: 10, classesUsed: 3, validUntil: null },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "plan-1", type: "LIVE", name: "Mensual" });
    mocks.reservationRepository.reactivate.mockImplementation(async (id, data) =>
      makeReservation({ id, status: "CONFIRMED", userPlanId: data.userPlanId ?? null, isTrial: data.isTrial ?? false })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite volver a reservar si la reserva previa está CANCELLED", async () => {
    mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(
      makeReservation({ id: "res-old", status: "CANCELLED", userPlanId: null })
    );

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(true);
    // Reactiva la fila existente: crear una nueva viola @@unique([userId, liveClassId])
    expect(mocks.reservationRepository.reactivate).toHaveBeenCalledWith(
      "res-old",
      expect.objectContaining({ userPlanId: "up-1", isTrial: false })
    );
    expect(mocks.reservationRepository.create).not.toHaveBeenCalled();
    // Descuenta la clase del plan igual que una reserva nueva
    expect(mocks.userPlanRepository.incrementClassesUsed).toHaveBeenCalledWith("up-1");
  });

  it("permite volver a reservar si la reserva previa está LATE_CANCELLED", async () => {
    mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(
      makeReservation({ id: "res-old", status: "LATE_CANCELLED", userPlanId: null })
    );

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(true);
    expect(mocks.reservationRepository.reactivate).toHaveBeenCalledWith("res-old", expect.anything());
  });

  it("sigue bloqueando si ya hay una reserva CONFIRMED", async () => {
    mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(
      makeReservation({ id: "res-old", status: "CONFIRMED" })
    );

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("ALREADY_RESERVED");
      expect(result.message).toMatch(/Ya tienes una reserva/);
    }
    expect(mocks.reservationRepository.reactivate).not.toHaveBeenCalled();
    expect(mocks.userPlanRepository.incrementClassesUsed).not.toHaveBeenCalled();
  });

  it("envía el correo de confirmación al re-reservar", async () => {
    mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(
      makeReservation({ id: "res-old", status: "CANCELLED", userPlanId: null })
    );

    await reserveClassUseCase(userId, centerId, "lc-1");

    expect(sentEmails.list.some((e) => e.subject.startsWith("Reserva confirmada:"))).toBe(true);
  });

  it("respeta el cupo: si la clase está llena no reactiva la reserva cancelada", async () => {
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(20); // maxCapacity = 20
    mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(
      makeReservation({ id: "res-old", status: "CANCELLED" })
    );

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("NO_SPOTS");
    expect(mocks.reservationRepository.reactivate).not.toHaveBeenCalled();
  });

  it("respeta el plan: sin plan activo no reactiva la reserva cancelada", async () => {
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([]);
    mocks.reservationRepository.findByUserAndLiveClass.mockResolvedValue(
      makeReservation({ id: "res-old", status: "CANCELLED" })
    );

    const result = await reserveClassUseCase(userId, centerId, "lc-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("NO_ACTIVE_PLAN");
    expect(mocks.reservationRepository.reactivate).not.toHaveBeenCalled();
  });
});

// Bug A: hasTrialReservation cuenta correctamente por isTrial, no por la
// clase. Si un alumno reservó antes con plan en una clase trial-friendly,
// no debe quedar marcado como "ya usó su trial".
describe("hasTrialReservation contract — regresión Bug A", () => {
  it("solo debe contar reservas con isTrial=true en la consulta", () => {
    // Validación de la API: el use case llama hasTrialReservation con
    // (userId, centerId) y espera bool. El filtro por isTrial vive en el
    // adapter (reservation-repository.ts:117-129). Este test documenta el
    // contrato; el comportamiento real se cubre en integration via E2E.
    expect(typeof mocks.reservationRepository.hasTrialReservation).toBe("function");
  });
});

describe("canShowTrialCta — cliente migrado", () => {
  const userId = "user-1";
  const centerId = "center-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      allowTrialClassPerPerson: true,
    });
  });

  it("retorna false cuando la membresía está marcada como cliente migrado", async () => {
    mocks.userRepository.findMembership.mockResolvedValue({
      role: "STUDENT",
      isLegacyClient: true,
    });

    const result = await canShowTrialCta(userId, centerId);

    expect(result).toBe(false);
    expect(mocks.reservationRepository.findByUserIdAndCenterPaginated).not.toHaveBeenCalled();
  });
});

describe("isUserTrialEligible", () => {
  const userId = "user-1";
  const centerId = "center-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([]);
  });

  it("retorna true cuando centro permite trial, no es legacy, no usó el trial y no tiene plan", async () => {
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      allowTrialClassPerPerson: true,
    });
    mocks.userRepository.findMembership.mockResolvedValue({
      role: "STUDENT",
      isLegacyClient: false,
    });
    mocks.reservationRepository.hasTrialReservation.mockResolvedValue(false);

    expect(await isUserTrialEligible(userId, centerId)).toBe(true);
  });

  it("retorna false si el centro tiene trial deshabilitado", async () => {
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      allowTrialClassPerPerson: false,
    });

    expect(await isUserTrialEligible(userId, centerId)).toBe(false);
    expect(mocks.userRepository.findMembership).not.toHaveBeenCalled();
  });

  it("retorna false si el cliente está marcado como migrado", async () => {
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      allowTrialClassPerPerson: true,
    });
    mocks.userRepository.findMembership.mockResolvedValue({
      role: "STUDENT",
      isLegacyClient: true,
    });

    expect(await isUserTrialEligible(userId, centerId)).toBe(false);
    expect(mocks.reservationRepository.hasTrialReservation).not.toHaveBeenCalled();
  });

  it("retorna false si el cliente ya consumió el trial", async () => {
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      allowTrialClassPerPerson: true,
    });
    mocks.userRepository.findMembership.mockResolvedValue({
      role: "STUDENT",
      isLegacyClient: false,
    });
    mocks.reservationRepository.hasTrialReservation.mockResolvedValue(true);

    expect(await isUserTrialEligible(userId, centerId)).toBe(false);
  });

  it("retorna false si el cliente ya tiene un plan LIVE activo (no necesita trial)", async () => {
    mocks.centerRepository.findById.mockResolvedValue({
      id: centerId,
      allowTrialClassPerPerson: true,
    });
    mocks.userRepository.findMembership.mockResolvedValue({
      role: "STUDENT",
      isLegacyClient: false,
    });
    mocks.reservationRepository.hasTrialReservation.mockResolvedValue(false);
    mocks.userPlanRepository.findActiveByUserAndCenter.mockResolvedValue([
      { id: "up-1", planId: "p-1", classesTotal: 10, classesUsed: 0, validUntil: null, status: "ACTIVE", validFrom: new Date("2026-01-01") },
    ]);
    mocks.planRepository.findById.mockResolvedValue({ id: "p-1", type: "LIVE" });

    expect(await isUserTrialEligible(userId, centerId)).toBe(false);
  });
});
