import { describe, it, expect, vi, beforeEach } from "vitest";
import { listClassRosterUseCase } from "./class-roster";
import { classRosterQuerySchema } from "@/lib/dto/class-roster-dto";
import type { Center, LiveClass } from "@/lib/domain";

const mocks = vi.hoisted(() => ({
  centerRepository: { findById: vi.fn() },
  liveClassRepository: { findById: vi.fn() },
  prisma: { reservation: { findMany: vi.fn() } },
}));

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: mocks.centerRepository,
  liveClassRepository: mocks.liveClassRepository,
  prisma: mocks.prisma,
}));

function makeCenter(overrides: Partial<Center> = {}): Center {
  return {
    id: "center-1",
    name: "Centro Test",
    slug: "centro-test",
    currency: "CLP",
    timezone: "America/Santiago",
    cancelBeforeMinutes: 720,
    maxNoShowsPerMonth: 2,
    bookBeforeMinutes: 1440,
    notifyWhenSlotFreed: true,
    instructorCanReserveForStudent: true,
    allowTrialClassPerPerson: true,
    calendarStartHour: 7,
    calendarEndHour: 22,
    calendarWeekStartDay: 1,
    defaultClassDurationMinutes: 60,
    bankTransferEnabled: false,
    bankName: null,
    bankAccountType: null,
    bankAccountNumber: null,
    bankAccountHolder: null,
    bankAccountRut: null,
    bankAccountEmail: null,
    bankTransferAcceptPlans: true,
    bankTransferAcceptEvents: false,
    bankTransferRequireReceipt: true,
    welcomeEmailCustomBody: "",
    showClassRosterToStudents: true,
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
    startsAt: new Date(Date.now() + 60 * 60 * 1000),
    durationMinutes: 60,
    maxCapacity: 10,
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

describe("listClassRosterUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.centerRepository.findById.mockResolvedValue(makeCenter());
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass());
    mocks.prisma.reservation.findMany.mockResolvedValue([]);
  });

  it("devuelve ROSTER_DISABLED si el centro no habilitó la policy", async () => {
    mocks.centerRepository.findById.mockResolvedValue(
      makeCenter({ showClassRosterToStudents: false })
    );
    const result = await listClassRosterUseCase("lc-1", "center-1");
    expect(result).toEqual({
      success: false,
      code: "ROSTER_DISABLED",
      message: "El centro no habilitó ver quién más está registrado",
    });
    expect(mocks.liveClassRepository.findById).not.toHaveBeenCalled();
  });

  it("devuelve NOT_FOUND si la clase no existe", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(null);
    const result = await listClassRosterUseCase("lc-missing", "center-1");
    expect(result).toEqual({ success: false, code: "NOT_FOUND", message: "Clase no encontrada" });
  });

  it("devuelve NOT_FOUND si la clase pertenece a otro centro", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ centerId: "center-2" }));
    const result = await listClassRosterUseCase("lc-1", "center-1");
    expect(result).toEqual({ success: false, code: "NOT_FOUND", message: "Clase no encontrada" });
  });

  it("devuelve solo reservas CONFIRMED, mapeadas sin email", async () => {
    mocks.prisma.reservation.findMany.mockResolvedValue([
      {
        id: "res-1",
        status: "CONFIRMED",
        user: { id: "user-1", name: "María", lastName: "González", imageUrl: "https://cdn/x.jpg" },
      },
    ]);
    const result = await listClassRosterUseCase("lc-1", "center-1");
    expect(result).toEqual({
      success: true,
      roster: [{ userId: "user-1", name: "María", lastName: "González", imageUrl: "https://cdn/x.jpg" }],
    });
    expect(mocks.prisma.reservation.findMany).toHaveBeenCalledWith({
      where: { liveClassId: "lc-1", status: "CONFIRMED" },
      include: { user: { select: { id: true, name: true, lastName: true, imageUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
  });

  it("no incluye email en las entradas del roster", async () => {
    mocks.prisma.reservation.findMany.mockResolvedValue([
      { id: "res-1", status: "CONFIRMED", user: { id: "user-1", name: "María", lastName: null, imageUrl: null } },
    ]);
    const result = await listClassRosterUseCase("lc-1", "center-1");
    expect(result.success && result.roster[0]).not.toHaveProperty("email");
  });
});

describe("classRosterQuerySchema", () => {
  it("acepta liveClassId válido y no vacío", () => {
    const result = classRosterQuerySchema.safeParse({ liveClassId: "lc-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.liveClassId).toBe("lc-1");
    }
  });

  it("rechaza liveClassId vacío", () => {
    const result = classRosterQuerySchema.safeParse({ liveClassId: "" });
    expect(result.success).toBe(false);
  });
});
