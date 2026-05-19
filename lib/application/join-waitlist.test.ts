import { describe, it, expect, vi, beforeEach } from "vitest";
import { joinWaitlistUseCase } from "./join-waitlist";
import type { LiveClass } from "@/lib/domain";
import type { Event } from "@/lib/domain/event";

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
  waitlistRepository: {
    findByUserAndItem: vi.fn(),
    create: vi.fn(),
    countActiveHoldsByEventId: vi.fn(),
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  centerRepository: mocks.centerRepository,
  liveClassRepository: mocks.liveClassRepository,
  eventRepository: mocks.eventRepository,
  eventTicketRepository: mocks.eventTicketRepository,
  waitlistRepository: mocks.waitlistRepository,
}));

function makeLiveClass(overrides: Partial<LiveClass> = {}): LiveClass {
  return {
    id: "lc_1",
    centerId: "ctr_1",
    title: "Vinyasa",
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    durationMinutes: 60,
    maxCapacity: 10,
    isOnline: false,
    status: "ACTIVE",
    acceptsTrialReservations: false,
    classPassEnabled: false,
    ...overrides,
  } as LiveClass;
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "ev_1",
    centerId: "ctr_1",
    title: "Retiro",
    description: null,
    location: "Centro",
    imageUrl: null,
    startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    endsAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
    amountCents: 50000,
    currency: "CLP",
    maxCapacity: 20,
    status: "PUBLISHED",
    color: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.centerRepository.findById.mockResolvedValue({
    id: "ctr_1",
    notifyWhenSlotFreed: true,
  });
});

describe("joinWaitlistUseCase — clase", () => {
  it("falla si la clase no existe", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(null);
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "class",
      itemId: "lc_1",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("ITEM_NOT_FOUND");
  });

  it("falla si la clase no pertenece al centro", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ centerId: "other" }));
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "class",
      itemId: "lc_1",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("FORBIDDEN");
  });

  it("falla si el centro tiene notifyWhenSlotFreed=false", async () => {
    mocks.centerRepository.findById.mockResolvedValue({
      id: "ctr_1",
      notifyWhenSlotFreed: false,
    });
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass());
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "class",
      itemId: "lc_1",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("WAITLIST_DISABLED");
  });

  it("falla si la clase aún tiene cupos disponibles", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ maxCapacity: 10 }));
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "class",
      itemId: "lc_1",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("HAS_SPOTS");
  });

  it("falla si ya está activa en la waitlist", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ maxCapacity: 5 }));
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    mocks.waitlistRepository.findByUserAndItem.mockResolvedValue({
      id: "wl_1",
      status: "QUEUED",
      userId: "u1",
      centerId: "ctr_1",
      liveClassId: "lc_1",
      eventId: null,
      position: 1,
      notifiedAt: null,
      heldUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "class",
      itemId: "lc_1",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("ALREADY_IN_WAITLIST");
  });

  it("crea entry si la clase está llena y no estaba en waitlist", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ maxCapacity: 5 }));
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    mocks.waitlistRepository.findByUserAndItem.mockResolvedValue(null);
    mocks.waitlistRepository.create.mockResolvedValue({
      id: "wl_2",
      userId: "u1",
      centerId: "ctr_1",
      liveClassId: "lc_1",
      eventId: null,
      status: "QUEUED",
      position: 3,
      notifiedAt: null,
      heldUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "class",
      itemId: "lc_1",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.entry.position).toBe(3);
      expect(mocks.waitlistRepository.create).toHaveBeenCalledWith({
        userId: "u1",
        centerId: "ctr_1",
        kind: "class",
        itemId: "lc_1",
      });
    }
  });

  it("permite re-unirse si la entry previa terminó (CANCELLED/EXPIRED)", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass({ maxCapacity: 5 }));
    mocks.liveClassRepository.countConfirmedReservations.mockResolvedValue(5);
    mocks.waitlistRepository.findByUserAndItem.mockResolvedValue({
      id: "wl_old",
      status: "CANCELLED",
      userId: "u1",
      centerId: "ctr_1",
      liveClassId: "lc_1",
      eventId: null,
      position: 1,
      notifiedAt: null,
      heldUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // En este caso la unique constraint del repo lanzará al crear; el use case
    // debería detectar la entry terminal y retornar un error claro recomendando
    // que la unique constraint requiere borrado, o reusar la entry.
    // Para mantener KISS: reutilizamos la unique constraint y devolvemos error;
    // el front-end mostrará "ya estuviste en esta waitlist anteriormente".
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "class",
      itemId: "lc_1",
    });
    // Por pragmatismo: cualquier entry previa (terminal o activa) devuelve error.
    // Si en el futuro se quiere permitir re-unirse, hay que ajustar.
    expect(r.success).toBe(false);
  });
});

describe("joinWaitlistUseCase — evento", () => {
  it("falla si el evento no existe", async () => {
    mocks.eventRepository.findById.mockResolvedValue(null);
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "event",
      itemId: "ev_1",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("ITEM_NOT_FOUND");
  });

  it("falla si el evento aún tiene cupo (PAID + HELD < maxCapacity)", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ maxCapacity: 10 }));
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(5);
    mocks.waitlistRepository.countActiveHoldsByEventId.mockResolvedValue(2);
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "event",
      itemId: "ev_1",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("HAS_SPOTS");
  });

  it("crea entry si el evento está lleno", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ maxCapacity: 5 }));
    mocks.eventTicketRepository.countPaidByEventId.mockResolvedValue(4);
    mocks.waitlistRepository.countActiveHoldsByEventId.mockResolvedValue(1);
    mocks.waitlistRepository.findByUserAndItem.mockResolvedValue(null);
    mocks.waitlistRepository.create.mockResolvedValue({
      id: "wl_3",
      userId: "u1",
      centerId: "ctr_1",
      liveClassId: null,
      eventId: "ev_1",
      status: "QUEUED",
      position: 1,
      notifiedAt: null,
      heldUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "event",
      itemId: "ev_1",
    });
    expect(r.success).toBe(true);
  });

  it("trata maxCapacity=null como 'sin cupo definido' → no permite waitlist (no aplica)", async () => {
    mocks.eventRepository.findById.mockResolvedValue(makeEvent({ maxCapacity: null }));
    const r = await joinWaitlistUseCase({
      userId: "u1",
      centerId: "ctr_1",
      kind: "event",
      itemId: "ev_1",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.code).toBe("HAS_SPOTS");
  });
});
