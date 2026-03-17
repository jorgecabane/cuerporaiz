import type { LiveClass } from "@/lib/domain";

export interface CreateLiveClassInput {
  title: string;
  startsAt: Date;
  durationMinutes: number;
  maxCapacity: number;
  disciplineId?: string | null;
  instructorId?: string | null;
  isOnline?: boolean;
  meetingUrl?: string | null;
  isTrialClass?: boolean;
  trialCapacity?: number | null;
  color?: string | null;
  classPassEnabled?: boolean;
  classPassCapacity?: number | null;
  seriesId?: string | null;
}

export interface UpdateLiveClassInput {
  title?: string;
  startsAt?: Date;
  durationMinutes?: number;
  maxCapacity?: number;
  disciplineId?: string | null;
  instructorId?: string | null;
  isOnline?: boolean;
  meetingUrl?: string | null;
  isTrialClass?: boolean;
  trialCapacity?: number | null;
  color?: string | null;
  classPassEnabled?: boolean;
  classPassCapacity?: number | null;
  seriesId?: string | null;
  status?: string;
}

export interface ListByCenterOptions {
  limit?: number;
  offset?: number;
}

export interface ILiveClassRepository {
  findById(id: string): Promise<LiveClass | null>;
  findByCenterId(centerId: string, from?: Date): Promise<LiveClass[]>;
  findByCenterIdPaginated(
    centerId: string,
    from: Date | undefined,
    options: { limit: number; offset: number }
  ): Promise<{ items: LiveClass[]; total: number }>;
  findByCenterIdAndRange(
    centerId: string,
    from: Date,
    to: Date,
    instructorId?: string
  ): Promise<LiveClass[]>;
  findBySeriesId(seriesId: string): Promise<LiveClass[]>;
  countConfirmedReservations(liveClassId: string): Promise<number>;
  create(centerId: string, data: CreateLiveClassInput): Promise<LiveClass>;
  createMany(centerId: string, data: CreateLiveClassInput[]): Promise<number>;
  update(id: string, centerId: string, data: UpdateLiveClassInput): Promise<LiveClass | null>;
  updateManyBySeriesId(seriesId: string, centerId: string, data: UpdateLiveClassInput): Promise<number>;
  deleteBySeriesIdFromDate(seriesId: string, centerId: string, fromDate: Date): Promise<number>;
  delete(id: string, centerId: string): Promise<boolean>;
}
