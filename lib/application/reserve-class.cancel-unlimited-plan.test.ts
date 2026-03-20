import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reservationRepository: {
    findById: vi.fn(),
    updateStatus: vi.fn(),
  },
  liveClassRepository: {
    findById: vi.fn(),
  },
  centerRepository: {
    findById: vi.fn(),
  },
  userPlanRepository: {
    findById: vi.fn(),
    decrementClassesUsed: vi.fn(),
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  reservationRepository: mocks.reservationRepository,
  liveClassRepository: mocks.liveClassRepository,
  centerRepository: mocks.centerRepository,
  userPlanRepository: mocks.userPlanRepository,
  // otros repos no usados por este test
  instructorRepository: {},
  userRepository: {},
  liveClassSeriesRepository: {},
  disciplineRepository: {},
  mercadopagoConfigRepository: {},
  zoomConfigRepository: {},
  googleMeetConfigRepository: {},
  planRepository: {},
  orderRepository: {},
  webhookEventRepository: {},
  prisma: {},
}));

import { cancelReservationUseCase } from "./reserve-class";

describe("cancelReservationUseCase", () => {
  it("no decrementa classesUsed si el plan es ilimitado (classesTotal === null)", async () => {
    mocks.reservationRepository.findById.mockResolvedValue({
      id: "r1",
      userId: "u1",
      liveClassId: "lc1",
      userPlanId: "up1",
      status: "CONFIRMED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.liveClassRepository.findById.mockResolvedValue({
      id: "lc1",
      centerId: "c1",
      title: "Clase",
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      durationMinutes: 60,
      maxCapacity: 10,
      isTrialClass: false,
      isOnline: false,
    });
    mocks.centerRepository.findById.mockResolvedValue({
      id: "c1",
      cancelBeforeMinutes: 2 * 60,
    });
    mocks.reservationRepository.updateStatus.mockResolvedValue({
      id: "r1",
      userId: "u1",
      liveClassId: "lc1",
      userPlanId: "up1",
      status: "CANCELLED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mocks.userPlanRepository.findById.mockResolvedValue({
      id: "up1",
      classesTotal: null,
      classesUsed: 99,
    });

    const result = await cancelReservationUseCase("u1", "c1", "r1");

    expect(result.success).toBe(true);
    expect(mocks.userPlanRepository.decrementClassesUsed).not.toHaveBeenCalled();
  });
});

