import { describe, expect, it, vi, beforeEach } from "vitest";

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
  notifyWaitlistOnSpotFreed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/adapters/db", () => ({
  reservationRepository: mocks.reservationRepository,
  liveClassRepository: mocks.liveClassRepository,
  centerRepository: mocks.centerRepository,
  userPlanRepository: mocks.userPlanRepository,
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
  centerHolidayRepository: {},
  prisma: {},
}));

vi.mock("./notify-waitlist-on-spot-freed", () => ({
  notifyWaitlistOnSpotFreed: mocks.notifyWaitlistOnSpotFreed,
}));

import {
  cancelReservationUseCase,
  cancelReservationByStaffUseCase,
} from "./reserve-class";

function setupCommonMocks(opts: {
  startsInMinutes: number;
  cancelBeforeMinutes: number;
}) {
  mocks.reservationRepository.findById.mockResolvedValue({
    id: "r1",
    userId: "u1",
    liveClassId: "lc1",
    userPlanId: null,
    status: "CONFIRMED",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mocks.liveClassRepository.findById.mockResolvedValue({
    id: "lc1",
    centerId: "c1",
    title: "Clase",
    startsAt: new Date(Date.now() + opts.startsInMinutes * 60 * 1000),
    durationMinutes: 60,
    maxCapacity: 10,
    isTrialClass: false,
    isOnline: false,
  });
  mocks.centerRepository.findById.mockResolvedValue({
    id: "c1",
    cancelBeforeMinutes: opts.cancelBeforeMinutes,
  });
  mocks.reservationRepository.updateStatus.mockImplementation(
    async (_id: string, status: string) => ({
      id: "r1",
      userId: "u1",
      liveClassId: "lc1",
      userPlanId: null,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );
}

describe("cancelReservationUseCase — trigger waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispara notifyWaitlistOnSpotFreed cuando CANCELLED (a tiempo)", async () => {
    setupCommonMocks({ startsInMinutes: 24 * 60, cancelBeforeMinutes: 120 });
    const r = await cancelReservationUseCase("u1", "c1", "r1");
    expect(r.success).toBe(true);
    expect(mocks.notifyWaitlistOnSpotFreed).toHaveBeenCalledTimes(1);
    expect(mocks.notifyWaitlistOnSpotFreed).toHaveBeenCalledWith("class", "lc1");
  });

  it("dispara notifyWaitlistOnSpotFreed también cuando LATE_CANCELLED", async () => {
    // 30 min antes pero la ventana exige 120 → cae a LATE_CANCELLED
    setupCommonMocks({ startsInMinutes: 30, cancelBeforeMinutes: 120 });
    const r = await cancelReservationUseCase("u1", "c1", "r1");
    expect(r.success).toBe(true);
    expect(mocks.notifyWaitlistOnSpotFreed).toHaveBeenCalledTimes(1);
    expect(mocks.notifyWaitlistOnSpotFreed).toHaveBeenCalledWith("class", "lc1");
  });
});

describe("cancelReservationByStaffUseCase — trigger waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispara notifyWaitlistOnSpotFreed cuando CANCELLED (a tiempo)", async () => {
    setupCommonMocks({ startsInMinutes: 24 * 60, cancelBeforeMinutes: 120 });
    const r = await cancelReservationByStaffUseCase("c1", "r1");
    expect(r.success).toBe(true);
    expect(mocks.notifyWaitlistOnSpotFreed).toHaveBeenCalledTimes(1);
    expect(mocks.notifyWaitlistOnSpotFreed).toHaveBeenCalledWith("class", "lc1");
  });

  it("dispara notifyWaitlistOnSpotFreed también cuando LATE_CANCELLED", async () => {
    setupCommonMocks({ startsInMinutes: 30, cancelBeforeMinutes: 120 });
    const r = await cancelReservationByStaffUseCase("c1", "r1");
    expect(r.success).toBe(true);
    expect(mocks.notifyWaitlistOnSpotFreed).toHaveBeenCalledTimes(1);
    expect(mocks.notifyWaitlistOnSpotFreed).toHaveBeenCalledWith("class", "lc1");
  });
});
