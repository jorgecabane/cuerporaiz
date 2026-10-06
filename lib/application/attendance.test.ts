import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  liveClassRepository: { findByIds: vi.fn(), findById: vi.fn() },
  findMany: vi.fn(),
}));
vi.mock("@/lib/adapters/db", () => ({
  liveClassRepository: mocks.liveClassRepository,
  reservationRepository: {},
  userPlanRepository: {},
  centerRepository: {},
}));
vi.mock("@/lib/adapters/db/prisma", () => ({ prisma: { reservation: { findMany: mocks.findMany } } }));

import { listAttendanceForClassesUseCase } from "./attendance";

const cls = (id: string, centerId = "c1") => ({ id, centerId });
const res = (id: string, liveClassId: string, status = "CONFIRMED") => ({
  id, liveClassId, status, user: { id: `u-${id}`, name: `N-${id}`, email: `${id}@correo.cl` },
});

describe("listAttendanceForClassesUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("agrupa por clase en una sola consulta e ignora clases de otro centro", async () => {
    mocks.liveClassRepository.findByIds.mockResolvedValue([cls("a"), cls("b"), cls("x", "c2")]);
    mocks.findMany.mockResolvedValue([res("r1", "a"), res("r2", "a", "ATTENDED"), res("r3", "b", "NO_SHOW")]);

    const byClass = await listAttendanceForClassesUseCase(["a", "b", "x"], "c1");

    expect(Object.keys(byClass)).toEqual(["a", "b"]);
    expect(byClass.a.map((r) => r.reservationId)).toEqual(["r1", "r2"]);
    expect(byClass.b[0]).toEqual({ reservationId: "r3", userId: "u-r3", userName: "N-r3", userEmail: "r3@correo.cl", status: "NO_SHOW" });
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany.mock.calls[0][0].where.liveClassId).toEqual({ in: ["a", "b"] });
  });

  it("sin clases válidas no consulta reservas", async () => {
    mocks.liveClassRepository.findByIds.mockResolvedValue([cls("x", "c2")]);
    expect(await listAttendanceForClassesUseCase(["x"], "c1")).toEqual({});
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
