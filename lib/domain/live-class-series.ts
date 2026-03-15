import type { CenterId } from "./user";

export type LiveClassSeriesId = string;

export type RepeatFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface LiveClassSeries {
  id: LiveClassSeriesId;
  centerId: CenterId;
  title: string;
  disciplineId: string | null;
  instructorId: string | null;
  maxCapacity: number;
  durationMinutes: number;
  isOnline: boolean;
  isTrialClass: boolean;
  trialCapacity: number | null;
  color: string | null;
  classPassEnabled: boolean;
  classPassCapacity: number | null;
  repeatFrequency: RepeatFrequency;
  repeatOnDaysOfWeek: number[];
  repeatEveryN: number;
  startsAt: Date;
  endsAt: Date | null;
  repeatCount: number | null;
  monthlyMode: string | null;
  createdAt: Date;
  updatedAt: Date;
}
