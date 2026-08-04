import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LiveClass, LiveClassSeries } from "@/lib/domain";

// Nota: `updateMeetingForClass` / `deleteMeetingForClass` viven en el MISMO
// módulo bajo prueba (actions.ts), así que no se pueden espiar directamente
// (una llamada intra-módulo en ESM no pasa por el binding exportado). En su
// lugar mockeamos la capa de la que dependen — updateZoomMeeting/
// deleteZoomMeeting/updateGoogleMeetMeeting/deleteGoogleMeetMeeting — y
// verificamos ahí que se llamó con los argumentos correctos.
const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => ({
    user: { id: "u1", centerId: "center-1", role: "ADMINISTRATOR" as const },
  })),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  liveClassRepository: {
    findById: vi.fn(),
    findBySeriesId: vi.fn(async () => [] as LiveClass[]),
    countDetachedBySeriesFromDate: vi.fn(async () => 0),
    countConfirmedByLiveClassIds: vi.fn(async () => new Map<string, number>()),
    create: vi.fn(async () => ({}) as LiveClass),
    createMany: vi.fn(async () => 0),
    update: vi.fn(async () => ({}) as LiveClass),
    updateManyBySeriesId: vi.fn(async () => 0),
    deleteBySeriesIdFromDate: vi.fn(async () => 0),
  },
  liveClassSeriesRepository: {
    findById: vi.fn(),
    create: vi.fn(async () => ({}) as LiveClassSeries),
    update: vi.fn(async () => ({}) as LiveClassSeries),
  },
  centerHolidayRepository: {
    findByCenterId: vi.fn(async () => []),
  },
  centerRepository: {
    findById: vi.fn(async () => ({ timezone: "America/Santiago" })),
  },
  reservationRepository: {},
  userRepository: {},
  createZoomMeeting: vi.fn(async () => ({ joinUrl: "https://zoom.us/j/new", externalId: "new-id" })),
  createGoogleMeetMeeting: vi.fn(async () => ({ joinUrl: "https://meet.google.com/new", externalId: "new-id" })),
  updateZoomMeeting: vi.fn(async () => {}),
  deleteZoomMeeting: vi.fn(async () => {}),
  updateGoogleMeetMeeting: vi.fn(async () => {}),
  deleteGoogleMeetMeeting: vi.fn(async () => {}),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/adapters/db", () => ({
  liveClassRepository: mocks.liveClassRepository,
  liveClassSeriesRepository: mocks.liveClassSeriesRepository,
  centerHolidayRepository: mocks.centerHolidayRepository,
  centerRepository: mocks.centerRepository,
  reservationRepository: mocks.reservationRepository,
  userRepository: mocks.userRepository,
}));
vi.mock("@/lib/application/create-zoom-meeting", () => ({
  createZoomMeeting: mocks.createZoomMeeting,
}));
vi.mock("@/lib/application/create-google-meet-meeting", () => ({
  createGoogleMeetMeeting: mocks.createGoogleMeetMeeting,
}));
vi.mock("@/lib/application/update-zoom-meeting", () => ({
  updateZoomMeeting: mocks.updateZoomMeeting,
  deleteZoomMeeting: mocks.deleteZoomMeeting,
}));
vi.mock("@/lib/application/update-google-meet-meeting", () => ({
  updateGoogleMeetMeeting: mocks.updateGoogleMeetMeeting,
  deleteGoogleMeetMeeting: mocks.deleteGoogleMeetMeeting,
}));

import {
  createLiveClass,
  updateLiveClass,
  updateSeriesClasses,
  type CreateClassFormData,
  type UpdateClassFormData,
  type EditSeriesFormData,
} from "./actions";

function makeLiveClass(overrides: Partial<LiveClass> = {}): LiveClass {
  return {
    id: "c1",
    centerId: "center-1",
    title: "Yoga básico",
    startsAt: new Date("2026-08-10T14:00:00.000Z"),
    durationMinutes: 60,
    maxCapacity: 20,
    disciplineId: null,
    instructorId: null,
    isOnline: true,
    meetingUrl: "https://zoom.us/j/123",
    meetingProvider: "zoom",
    meetingExternalId: "zoom-123",
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

function makeUpdateData(overrides: Partial<UpdateClassFormData> = {}): UpdateClassFormData {
  return {
    id: "c1",
    title: "Yoga básico",
    disciplineId: null,
    instructorId: null,
    startsAt: "2026-08-10T14:00:00.000Z",
    durationMinutes: 60,
    maxCapacity: 20,
    isOnline: true,
    meetingUrl: "https://zoom.us/j/123",
    meetingProvider: "zoom",
    meetingExternalId: "zoom-123",
    acceptsTrialReservations: false,
    trialCapacity: null,
    color: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    user: { id: "u1", centerId: "center-1", role: "ADMINISTRATOR" as const },
  });
  mocks.liveClassRepository.findBySeriesId.mockResolvedValue([]);
  mocks.liveClassRepository.countDetachedBySeriesFromDate.mockResolvedValue(0);
  mocks.liveClassRepository.countConfirmedByLiveClassIds.mockResolvedValue(new Map());
  mocks.centerHolidayRepository.findByCenterId.mockResolvedValue([]);
  mocks.centerRepository.findById.mockResolvedValue({ timezone: "America/Santiago" });
});

describe("createLiveClass", () => {
  function makeCreateData(overrides: Partial<CreateClassFormData> = {}): CreateClassFormData {
    return {
      title: "Yoga básico",
      disciplineId: null,
      instructorId: null,
      startsAt: "2099-01-01T14:00:00.000Z",
      durationMinutes: 60,
      maxCapacity: 20,
      isOnline: true,
      meetingUrl: "https://meet.google.com/abc",
      meetingProvider: "meet",
      meetingExternalId: "evt-1",
      acceptsTrialReservations: false,
      trialCapacity: null,
      color: null,
      repeat: "none",
      repeatOnDays: [],
      repeatEveryN: 1,
      repeatEnd: "never",
      repeatEndDate: null,
      repeatEndCount: null,
      monthlyMode: null,
      ...overrides,
    };
  }

  it("persiste meetingProvider y meetingExternalId de una clase única online", async () => {
    await createLiveClass(makeCreateData()).catch(() => {});

    expect(mocks.liveClassRepository.create).toHaveBeenCalledWith(
      "center-1",
      expect.objectContaining({ meetingProvider: "meet", meetingExternalId: "evt-1" })
    );
  });

  it("nunca persiste un provider desconocido (ni su externalId huérfano)", async () => {
    await createLiveClass(
      makeCreateData({ meetingProvider: "webex", meetingExternalId: "whatever" })
    ).catch(() => {});

    expect(mocks.liveClassRepository.create).toHaveBeenCalledWith(
      "center-1",
      expect.objectContaining({ meetingProvider: null, meetingExternalId: null })
    );
  });
});

describe("updateLiveClass", () => {
  it("cambia sólo el título → PATCH únicamente con title (sin startTime/durationMinutes)", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass());

    await updateLiveClass(makeUpdateData({ title: "Yoga avanzado" })).catch(() => {});

    expect(mocks.updateZoomMeeting).toHaveBeenCalledWith("center-1", "zoom-123", {
      title: "Yoga avanzado",
      startTime: undefined,
      durationMinutes: undefined,
    });
    expect(mocks.deleteZoomMeeting).not.toHaveBeenCalled();
    expect(mocks.liveClassRepository.update).toHaveBeenCalledWith(
      "c1",
      "center-1",
      expect.objectContaining({ meetingProvider: "zoom", meetingExternalId: "zoom-123" })
    );
  });

  it("cambia la hora → PATCH con startTime Y durationMinutes SIEMPRE juntos (nunca uno solo)", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass());
    const newStartsAt = "2026-08-10T16:00:00.000Z";

    await updateLiveClass(makeUpdateData({ startsAt: newStartsAt })).catch(() => {});

    expect(mocks.updateZoomMeeting).toHaveBeenCalledWith("center-1", "zoom-123", {
      title: undefined,
      startTime: new Date(newStartsAt),
      durationMinutes: 60,
    });
  });

  it("cambia sólo la duración → igual manda startTime Y durationMinutes juntos", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass());

    await updateLiveClass(makeUpdateData({ durationMinutes: 90 })).catch(() => {});

    expect(mocks.updateZoomMeeting).toHaveBeenCalledWith("center-1", "zoom-123", {
      title: undefined,
      startTime: new Date("2026-08-10T14:00:00.000Z"),
      durationMinutes: 90,
    });
  });

  it("desmarca online (meetingUrl→null) → borra la reunión y limpia provider/externalId", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass());

    await updateLiveClass(
      makeUpdateData({ isOnline: false, meetingUrl: null, meetingProvider: null, meetingExternalId: null })
    ).catch(() => {});

    expect(mocks.deleteZoomMeeting).toHaveBeenCalledWith("center-1", "zoom-123");
    expect(mocks.updateZoomMeeting).not.toHaveBeenCalled();
    expect(mocks.liveClassRepository.update).toHaveBeenCalledWith(
      "c1",
      "center-1",
      expect.objectContaining({ meetingProvider: null, meetingExternalId: null, meetingUrl: null })
    );
  });

  it("legacy (meetingUrl sin meetingExternalId) → nunca hace PATCH, deja el link tal cual", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({
        meetingProvider: null,
        meetingExternalId: null,
        meetingUrl: "https://old-legacy-link.example.com",
      })
    );

    await updateLiveClass(
      makeUpdateData({
        title: "Título nuevo",
        meetingUrl: "https://old-legacy-link.example.com",
        meetingProvider: null,
        meetingExternalId: null,
      })
    ).catch(() => {});

    expect(mocks.updateZoomMeeting).not.toHaveBeenCalled();
    expect(mocks.updateGoogleMeetMeeting).not.toHaveBeenCalled();
    expect(mocks.deleteZoomMeeting).not.toHaveBeenCalled();
    expect(mocks.deleteGoogleMeetMeeting).not.toHaveBeenCalled();
    expect(mocks.liveClassRepository.update).toHaveBeenCalledWith(
      "c1",
      "center-1",
      expect.objectContaining({
        meetingProvider: null,
        meetingExternalId: null,
        meetingUrl: "https://old-legacy-link.example.com",
      })
    );
  });

  it("si el PATCH falla, lanza error claro y NO persiste nada (ni redirige)", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass());
    mocks.updateZoomMeeting.mockRejectedValueOnce(new Error("Zoom API caída"));

    await expect(
      updateLiveClass(makeUpdateData({ title: "Yoga avanzado" }))
    ).rejects.toThrow("No pudimos actualizar la reunión online");

    expect(mocks.liveClassRepository.update).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("si el borrado best-effort falla, NO bloquea la operación (igual persiste y redirige)", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(makeLiveClass());
    mocks.deleteZoomMeeting.mockRejectedValueOnce(new Error("Zoom API caída"));

    await expect(
      updateLiveClass(makeUpdateData({ isOnline: false, meetingUrl: null }))
    ).rejects.toThrow("REDIRECT:");

    expect(mocks.liveClassRepository.update).toHaveBeenCalledWith(
      "c1",
      "center-1",
      expect.objectContaining({ meetingProvider: null, meetingExternalId: null })
    );
  });

  it("nunca persiste un provider desconocido cuando no hay reunión previa que sincronizar", async () => {
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ isOnline: false, meetingUrl: null, meetingProvider: null, meetingExternalId: null })
    );

    await updateLiveClass(
      makeUpdateData({
        isOnline: true,
        meetingUrl: "https://fake-provider.example.com/x",
        meetingProvider: "webex",
        meetingExternalId: "abc123",
      })
    ).catch(() => {});

    expect(mocks.liveClassRepository.update).toHaveBeenCalledWith(
      "c1",
      "center-1",
      expect.objectContaining({ meetingProvider: null, meetingExternalId: null })
    );
  });
});

describe("updateSeriesClasses", () => {
  function makeSeries(overrides: Partial<LiveClassSeries> = {}): LiveClassSeries {
    return {
      id: "series-1",
      centerId: "center-1",
      title: "Yoga recurrente",
      disciplineId: null,
      instructorId: null,
      maxCapacity: 20,
      durationMinutes: 60,
      isOnline: true,
      meetingUrl: "https://meet.google.com/abc",
      meetingProvider: "meet",
      meetingExternalId: "evt-1",
      acceptsTrialReservations: false,
      trialCapacity: null,
      color: null,
      classPassEnabled: false,
      classPassCapacity: null,
      repeatFrequency: "DAILY",
      repeatOnDaysOfWeek: [],
      repeatEveryN: 1,
      startsAt: new Date("2026-08-01T14:00:00.000Z"),
      endsAt: null,
      repeatCount: null,
      monthlyMode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function makeEditData(overrides: Partial<EditSeriesFormData> = {}): EditSeriesFormData {
    return {
      id: "c1",
      title: "Yoga recurrente",
      disciplineId: null,
      instructorId: null,
      startsAt: "2026-08-01T14:00:00.000Z",
      durationMinutes: 60,
      maxCapacity: 20,
      isOnline: true,
      meetingUrl: "https://meet.google.com/abc",
      meetingProvider: "meet",
      meetingExternalId: "evt-1",
      acceptsTrialReservations: false,
      trialCapacity: null,
      color: null,
      scope: "all",
      seriesId: "series-1",
      repeat: "DAILY",
      repeatOnDays: [],
      repeatEveryN: 1,
      repeatEnd: "never",
      repeatEndDate: null,
      repeatEndCount: null,
      monthlyMode: null,
      ...overrides,
    };
  }

  it("scope all, cambia el título, sin cambio de horario → un solo PATCH del topic (sin hora)", async () => {
    const series = makeSeries();
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ id: "c1", seriesId: "series-1", startsAt: series.startsAt, title: series.title })
    );
    mocks.liveClassSeriesRepository.findById.mockResolvedValue(series);
    mocks.liveClassRepository.findBySeriesId.mockResolvedValue([
      { id: "c1", title: series.title, startsAt: series.startsAt, confirmed: 0 } as unknown as LiveClass,
    ]);

    const result = await updateSeriesClasses(makeEditData({ title: "Yoga recurrente PRO" }));

    expect(result).toEqual({ ok: true });
    expect(mocks.updateGoogleMeetMeeting).toHaveBeenCalledWith("center-1", "evt-1", {
      title: "Yoga recurrente PRO",
      startTime: undefined,
      durationMinutes: undefined,
    });
    expect(mocks.updateZoomMeeting).not.toHaveBeenCalled();
    expect(mocks.liveClassSeriesRepository.update).toHaveBeenCalledWith(
      "series-1",
      "center-1",
      expect.objectContaining({ meetingProvider: "meet", meetingExternalId: "evt-1" })
    );
  });

  it("scope all: si el PATCH de la serie falla, lanza error y NO persiste", async () => {
    const series = makeSeries();
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ id: "c1", seriesId: "series-1", startsAt: series.startsAt, title: series.title })
    );
    mocks.liveClassSeriesRepository.findById.mockResolvedValue(series);
    mocks.liveClassRepository.findBySeriesId.mockResolvedValue([
      { id: "c1", title: series.title, startsAt: series.startsAt, confirmed: 0 } as unknown as LiveClass,
    ]);
    mocks.updateGoogleMeetMeeting.mockRejectedValueOnce(new Error("Meet API caída"));

    await expect(
      updateSeriesClasses(makeEditData({ title: "Yoga recurrente PRO" }))
    ).rejects.toThrow("No pudimos actualizar la reunión online de la serie");

    expect(mocks.liveClassSeriesRepository.update).not.toHaveBeenCalled();
    expect(mocks.liveClassRepository.updateManyBySeriesId).not.toHaveBeenCalled();
  });

  it("scope this (desacople): NO hace PATCH a la reunión compartida y limpia meetingExternalId", async () => {
    const series = makeSeries();
    mocks.liveClassRepository.findById.mockResolvedValue(
      makeLiveClass({ id: "c1", seriesId: "series-1", startsAt: series.startsAt, title: series.title })
    );
    mocks.liveClassSeriesRepository.findById.mockResolvedValue(series);

    const result = await updateSeriesClasses(makeEditData({ scope: "this", title: "Sólo esta clase" }));

    expect(result).toEqual({ ok: true });
    expect(mocks.updateGoogleMeetMeeting).not.toHaveBeenCalled();
    expect(mocks.updateZoomMeeting).not.toHaveBeenCalled();
    expect(mocks.liveClassRepository.update).toHaveBeenCalledWith(
      "c1",
      "center-1",
      expect.objectContaining({
        meetingProvider: null,
        meetingExternalId: null,
        meetingUrl: "https://meet.google.com/abc",
        seriesId: null,
        detachedFromSeriesId: "series-1",
      })
    );
  });
});
