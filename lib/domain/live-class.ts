/**
 * Entidad de dominio: clase en vivo.
 * Sin referencias a Prisma ni a infraestructura.
 */
import type { CenterId } from "./user";

export type LiveClassId = string;
export type LiveClassStatus = "ACTIVE" | "CANCELLED" | "ARCHIVED";

export interface LiveClass {
  id: LiveClassId;
  centerId: CenterId;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  maxCapacity: number;
  disciplineId: string | null;
  instructorId: string | null;
  isOnline: boolean;
  meetingUrl: string | null;
  isTrialClass: boolean;
  trialCapacity: number | null;
  color: string | null;
  classPassEnabled: boolean;
  classPassCapacity: number | null;
  seriesId: string | null;
  status: LiveClassStatus;
  createdAt: Date;
  updatedAt: Date;
}
