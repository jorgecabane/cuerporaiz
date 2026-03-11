/**
 * Entidad de dominio: clase en vivo.
 * Sin referencias a Prisma ni a infraestructura.
 */
import type { CenterId } from "./user";

export type LiveClassId = string;

export interface LiveClass {
  id: LiveClassId;
  centerId: CenterId;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  maxCapacity: number;
  createdAt: Date;
  updatedAt: Date;
}
