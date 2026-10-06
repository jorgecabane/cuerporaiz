import { describe, it, expect, vi, beforeEach } from "vitest";
import { listClassRosterUseCase, listClassRostersUseCase } from "./class-roster";
import { classRosterQuerySchema, liveClassIdsQuerySchema, MAX_BATCH_CLASS_IDS } from "@/lib/dto/class-roster-dto";
import type { Center, LiveClass } from "@/lib/domain";

const mocks = vi.hoisted(() => ({
  centerRepository: { findById: vi.fn() },
  liveClassRepository: { findByIds: vi.fn() },
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
    mocks.liveClassRepository.findByIds.mockResolvedValue([makeLiveClass()]);
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
    expect(mocks.liveClassRepository.findByIds).not.toHaveBeenCalled();
  });

  it("devuelve NOT_FOUND si la clase no existe", async () => {
    mocks.liveClassRepository.findByIds.mockResolvedValue([]);
    const result = await listClassRosterUseCase("lc-missing", "center-1");
    expect(result).toEqual({ success: false, code: "NOT_FOUND", message: "Clase no encontrada" });
  });

  it("devuelve NOT_FOUND si la clase pertenece a otro centro", async () => {
    mocks.liveClassRepository.findByIds.mockResolvedValue([makeLiveClass({ centerId: "center-2" })]);
    const result = await listClassRosterUseCase("lc-1", "center-1");
    expect(result).toEqual({ success: false, code: "NOT_FOUND", message: "Clase no encontrada" });
  });

  it("devuelve solo reservas CONFIRMED, mapeadas sin email", async () => {
    mocks.prisma.reservation.findMany.mockResolvedValue([
      {
        id: "res-1",
        liveClassId: "lc-1",
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
      where: { liveClassId: { in: ["lc-1"] }, status: "CONFIRMED" },
      include: { user: { select: { id: true, name: true, lastName: true, imageUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
  });

  it("no incluye email en las entradas del roster", async () => {
    mocks.prisma.reservation.findMany.mockResolvedValue([
      { id: "res-1", liveClassId: "lc-1", status: "CONFIRMED", user: { id: "user-1", name: "María", lastName: null, imageUrl: null } },
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

describe("listClassRostersUseCase (lote)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.centerRepository.findById.mockResolvedValue(makeCenter());
  });

  it("agrupa por clase en una sola consulta e ignora clases de otro centro", async () => {
    mocks.liveClassRepository.findByIds.mockResolvedValue([
      makeLiveClass({ id: "lc-1" }),
      makeLiveClass({ id: "lc-2" }),
      makeLiveClass({ id: "lc-x", centerId: "center-2" }),
    ]);
    mocks.prisma.reservation.findMany.mockResolvedValue([
      { id: "r1", liveClassId: "lc-1", status: "CONFIRMED", user: { id: "u1", name: "Ana", lastName: null, imageUrl: null } },
      { id: "r2", liveClassId: "lc-1", status: "CONFIRMED", user: { id: "u2", name: "Beto", lastName: null, imageUrl: null } },
    ]);
    const result = await listClassRostersUseCase(["lc-1", "lc-2", "lc-x"], "center-1");
    expect(result.success && Object.keys(result.rosters)).toEqual(["lc-1", "lc-2"]);
    expect(result.success && result.rosters["lc-1"].map((r) => r.name)).toEqual(["Ana", "Beto"]);
    expect(result.success && result.rosters["lc-2"]).toEqual([]);
    expect(mocks.prisma.reservation.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.reservation.findMany.mock.calls[0][0].where.liveClassId).toEqual({ in: ["lc-1", "lc-2"] });
  });

  it("respeta ROSTER_DISABLED", async () => {
    mocks.centerRepository.findById.mockResolvedValue(makeCenter({ showClassRosterToStudents: false }));
    const result = await listClassRostersUseCase(["lc-1"], "center-1");
    expect(result.success).toBe(false);
  });
});

describe("liveClassIdsQuerySchema", () => {
  it("separa por comas, recorta y deduplica", () => {
    expect(liveClassIdsQuerySchema.parse(" a, b ,a,,c ")).toEqual(["a", "b", "c"]);
  });
  it("rechaza vacío o más del máximo", () => {
    expect(liveClassIdsQuerySchema.safeParse("").success).toBe(false);
    const tooMany = Array.from({ length: MAX_BATCH_CLASS_IDS + 1 }, (_, i) => `id${i}`).join(",");
    expect(liveClassIdsQuerySchema.safeParse(tooMany).success).toBe(false);
  });
});

