"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  liveClassRepository,
  liveClassSeriesRepository,
  centerHolidayRepository,
} from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";
import { generateSeriesInstances } from "@/lib/application/generate-series-instances";
import { createZoomMeeting } from "@/lib/application/create-zoom-meeting";
import { createGoogleMeetMeeting } from "@/lib/application/create-google-meet-meeting";
import type { RepeatFrequency } from "@/lib/domain";
import type { UpdateSeriesInput } from "@/lib/ports";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) {
    redirect("/panel");
  }
  return session.user.centerId;
}

/** Crea una reunión en Zoom o Google Meet y devuelve la URL. Usado al marcar "Clase online". */
export async function createMeetingForClass(
  provider: "zoom" | "meet",
  params: { title: string; startTime: string; durationMinutes: number }
): Promise<{ joinUrl: string }> {
  const centerId = await requireAdminCenterId();
  const startTime = new Date(params.startTime);

  if (provider === "zoom") {
    const result = await createZoomMeeting(centerId, {
      title: params.title,
      startTime,
      durationMinutes: params.durationMinutes,
    });
    return { joinUrl: result.joinUrl };
  }

  const result = await createGoogleMeetMeeting(centerId, {
    title: params.title,
    startTime,
    durationMinutes: params.durationMinutes,
  });
  return { joinUrl: result.joinUrl };
}

export interface CreateClassFormData {
  title: string;
  disciplineId: string | null;
  instructorId: string | null;
  startsAt: string;
  durationMinutes: number;
  maxCapacity: number;
  isOnline: boolean;
  meetingUrl: string | null;
  isTrialClass: boolean;
  trialCapacity: number | null;
  color: string | null;
  repeat: "none" | "DAILY" | "WEEKLY" | "MONTHLY";
  repeatOnDays: number[];
  repeatEveryN: number;
  repeatEnd: "never" | "date" | "count";
  repeatEndDate: string | null;
  repeatEndCount: number | null;
  monthlyMode: "dayOfMonth" | "weekdayOrdinal" | null;
}

export async function createLiveClass(data: CreateClassFormData): Promise<void> {
  const centerId = await requireAdminCenterId();

  const startsAt = new Date(data.startsAt);
  if (startsAt <= new Date()) {
    throw new Error("No se pueden agendar clases en el pasado.");
  }

  if (data.repeat === "none") {
    await liveClassRepository.create(centerId, {
      title: data.title,
      startsAt,
      durationMinutes: data.durationMinutes,
      maxCapacity: data.maxCapacity,
      disciplineId: data.disciplineId || null,
      instructorId: data.instructorId || null,
      isOnline: data.isOnline,
      meetingUrl: data.meetingUrl || null,
      isTrialClass: data.isTrialClass,
      trialCapacity: data.trialCapacity,
      color: data.color || null,
    });
  } else {
    const endsAt =
      data.repeatEnd === "date" && data.repeatEndDate
        ? new Date(data.repeatEndDate)
        : null;
    const repeatCount =
      data.repeatEnd === "count" && data.repeatEndCount
        ? data.repeatEndCount
        : null;

    const series = await liveClassSeriesRepository.create(centerId, {
      title: data.title,
      disciplineId: data.disciplineId || null,
      instructorId: data.instructorId || null,
      maxCapacity: data.maxCapacity,
      durationMinutes: data.durationMinutes,
      isOnline: data.isOnline,
      meetingUrl: data.meetingUrl || null,
      isTrialClass: data.isTrialClass,
      trialCapacity: data.trialCapacity,
      color: data.color || null,
      repeatFrequency: data.repeat as RepeatFrequency,
      repeatOnDaysOfWeek: data.repeatOnDays,
      repeatEveryN: data.repeatEveryN,
      startsAt,
      endsAt,
      repeatCount,
      monthlyMode: data.repeat === "MONTHLY" ? (data.monthlyMode ?? "dayOfMonth") : null,
    });

    const holidays = await centerHolidayRepository.findByCenterId(centerId);
    const holidayDates = new Set(
      holidays.map((h) => h.date.toISOString().slice(0, 10))
    );

    const instances = generateSeriesInstances(series, holidayDates);
    if (instances.length > 0) {
      await liveClassRepository.createMany(centerId, instances);
    }
  }

  redirect("/panel/horarios");
}

export interface UpdateClassFormData {
  id: string;
  title: string;
  disciplineId: string | null;
  instructorId: string | null;
  startsAt: string;
  durationMinutes: number;
  maxCapacity: number;
  isOnline: boolean;
  meetingUrl: string | null;
  isTrialClass: boolean;
  trialCapacity: number | null;
  color: string | null;
}

export async function updateLiveClass(data: UpdateClassFormData): Promise<void> {
  const centerId = await requireAdminCenterId();

  const existing = await liveClassRepository.findById(data.id);
  if (!existing || existing.centerId !== centerId) {
    throw new Error("Clase no encontrada.");
  }

  const startsAt = new Date(data.startsAt);

  await liveClassRepository.update(data.id, centerId, {
    title: data.title,
    startsAt,
    durationMinutes: data.durationMinutes,
    maxCapacity: data.maxCapacity,
    disciplineId: data.disciplineId || null,
    instructorId: data.instructorId || null,
    isOnline: data.isOnline,
    meetingUrl: data.meetingUrl || null,
    isTrialClass: data.isTrialClass,
    trialCapacity: data.trialCapacity,
    color: data.color || null,
  });

  redirect(`/panel/horarios`);
}

export async function cancelLiveClass(id: string): Promise<void> {
  const centerId = await requireAdminCenterId();

  const existing = await liveClassRepository.findById(id);
  if (!existing || existing.centerId !== centerId) {
    throw new Error("Clase no encontrada.");
  }

  await liveClassRepository.update(id, centerId, { status: "CANCELLED" });
  redirect("/panel/horarios");
}

export type EditScope = "this" | "thisAndFollowing" | "all";

export interface EditSeriesFormData extends UpdateClassFormData {
  scope: EditScope;
  seriesId: string;
}

export async function updateSeriesClasses(data: EditSeriesFormData): Promise<void> {
  const centerId = await requireAdminCenterId();

  const existing = await liveClassRepository.findById(data.id);
  if (!existing || existing.centerId !== centerId) {
    throw new Error("Clase no encontrada.");
  }

  const series = await liveClassSeriesRepository.findById(data.seriesId);
  if (!series || series.centerId !== centerId) {
    throw new Error("Serie no encontrada.");
  }

  const classUpdate = {
    title: data.title,
    durationMinutes: data.durationMinutes,
    maxCapacity: data.maxCapacity,
    disciplineId: data.disciplineId || null,
    instructorId: data.instructorId || null,
    isOnline: data.isOnline,
    meetingUrl: data.meetingUrl || null,
    isTrialClass: data.isTrialClass,
    trialCapacity: data.trialCapacity,
    color: data.color || null,
  };

  const seriesUpdate: UpdateSeriesInput = {
    title: data.title,
    durationMinutes: data.durationMinutes,
    maxCapacity: data.maxCapacity,
    disciplineId: data.disciplineId || null,
    instructorId: data.instructorId || null,
    isOnline: data.isOnline,
    meetingUrl: data.meetingUrl || null,
    isTrialClass: data.isTrialClass,
    trialCapacity: data.trialCapacity,
    color: data.color || null,
  };

  if (data.scope === "this") {
    await liveClassRepository.update(data.id, centerId, {
      ...classUpdate,
      startsAt: new Date(data.startsAt),
      seriesId: null,
    });
  } else if (data.scope === "thisAndFollowing") {
    const instanceDate = new Date(existing.startsAt);

    await liveClassSeriesRepository.update(series.id, centerId, {
      endsAt: instanceDate,
    });

    await liveClassRepository.deleteBySeriesIdFromDate(
      series.id,
      centerId,
      instanceDate,
    );

    const newSeries = await liveClassSeriesRepository.create(centerId, {
      ...seriesUpdate,
      title: data.title,
      maxCapacity: data.maxCapacity,
      durationMinutes: data.durationMinutes,
      repeatFrequency: series.repeatFrequency,
      repeatOnDaysOfWeek: series.repeatOnDaysOfWeek,
      repeatEveryN: series.repeatEveryN,
      startsAt: new Date(data.startsAt),
      endsAt: series.endsAt,
      repeatCount: series.repeatCount,
      monthlyMode: series.monthlyMode,
    });

    const instances = generateSeriesInstances(newSeries);
    if (instances.length > 0) {
      await liveClassRepository.createMany(centerId, instances);
    }
  } else {
    await liveClassSeriesRepository.update(series.id, centerId, seriesUpdate);
    await liveClassRepository.updateManyBySeriesId(series.id, centerId, classUpdate);
  }

  redirect("/panel/horarios");
}

export async function deleteLiveClass(formData: FormData): Promise<void> {
  const centerId = await requireAdminCenterId();
  const id = formData.get("id") as string;
  if (!id) return;
  await liveClassRepository.delete(id, centerId);
  redirect("/panel/horarios");
}
