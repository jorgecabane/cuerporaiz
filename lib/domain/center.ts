/**
 * Entidad de dominio: centro (tenant).
 * Sin referencias a Prisma ni a infraestructura.
 */
import type { CenterId } from "./user";

export interface Center {
  id: CenterId;
  name: string;
  slug: string;
  currency: string; // moneda del centro (ej. CLP); usada en planes
  cancelBeforeHours: number;
  maxNoShowsPerMonth: number;
  bookBeforeHours: number;
  notifyWhenSlotFreed: boolean;
  instructorCanReserveForStudent: boolean;
  allowTrialClassPerPerson: boolean;
  createdAt: Date;
  updatedAt: Date;
}
