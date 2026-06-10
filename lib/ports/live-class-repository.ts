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
  acceptsTrialReservations?: boolean;
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
  acceptsTrialReservations?: boolean;
  trialCapacity?: number | null;
  color?: string | null;
  classPassEnabled?: boolean;
  classPassCapacity?: number | null;
  seriesId?: string | null;
  detachedFromSeriesId?: string | null;
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
  /** Cuenta instancias activas desvinculadas de una serie (seriesId=null) con startsAt >= from. */
  countDetachedBySeriesFromDate(originalSeriesId: string, centerId: string, from: Date): Promise<number>;
  countConfirmedReservations(liveClassId: string): Promise<number>;
  /** Mapa liveClassId → reservas CONFIRMED para varias clases (una sola query). */
  countConfirmedByLiveClassIds(liveClassIds: string[]): Promise<Map<string, number>>;
  create(centerId: string, data: CreateLiveClassInput): Promise<LiveClass>;
  createMany(centerId: string, data: CreateLiveClassInput[]): Promise<number>;
  update(id: string, centerId: string, data: UpdateLiveClassInput): Promise<LiveClass | null>;
  updateManyBySeriesId(seriesId: string, centerId: string, data: UpdateLiveClassInput): Promise<number>;
  /** Actualiza varias clases por IDs, validando que pertenezcan al centro. Retorna cantidad actualizada. */
  updateManyByIds(ids: string[], centerId: string, data: UpdateLiveClassInput): Promise<number>;
  deleteBySeriesIdFromDate(seriesId: string, centerId: string, fromDate: Date): Promise<number>;
  delete(id: string, centerId: string): Promise<boolean>;
}
