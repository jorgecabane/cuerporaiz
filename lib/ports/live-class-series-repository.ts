import type { LiveClassSeries, RepeatFrequency } from "@/lib/domain";

export interface CreateSeriesInput {
  title: string;
  disciplineId?: string | null;
  instructorId?: string | null;
  maxCapacity: number;
  durationMinutes: number;
  isOnline?: boolean;
  meetingUrl?: string | null;
  isTrialClass?: boolean;
  trialCapacity?: number | null;
  color?: string | null;
  classPassEnabled?: boolean;
  classPassCapacity?: number | null;
  repeatFrequency: RepeatFrequency;
  repeatOnDaysOfWeek: number[];
  repeatEveryN?: number;
  startsAt: Date;
  endsAt?: Date | null;
  repeatCount?: number | null;
  monthlyMode?: string | null;
}

export interface UpdateSeriesInput {
  title?: string;
  disciplineId?: string | null;
  instructorId?: string | null;
  maxCapacity?: number;
  durationMinutes?: number;
  isOnline?: boolean;
  meetingUrl?: string | null;
  isTrialClass?: boolean;
  trialCapacity?: number | null;
  color?: string | null;
  endsAt?: Date | null;
}

export interface ILiveClassSeriesRepository {
  findById(id: string): Promise<LiveClassSeries | null>;
  findManyByCenterId(centerId: string): Promise<LiveClassSeries[]>;
  create(centerId: string, data: CreateSeriesInput): Promise<LiveClassSeries>;
  update(id: string, centerId: string, data: UpdateSeriesInput): Promise<LiveClassSeries | null>;
  delete(id: string, centerId: string): Promise<boolean>;
}
