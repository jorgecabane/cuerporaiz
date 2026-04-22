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
  /** Minutos antes del inicio para poder cancelar sin consumir clase */
  cancelBeforeMinutes: number;
  maxNoShowsPerMonth: number;
  /** Minutos mínimos que deben quedar antes del inicio para poder reservar */
  bookBeforeMinutes: number;
  notifyWhenSlotFreed: boolean;
  instructorCanReserveForStudent: boolean;
  allowTrialClassPerPerson: boolean;
  calendarStartHour: number;
  calendarEndHour: number;
  calendarWeekStartDay: number;
  defaultClassDurationMinutes: number;
  bankTransferEnabled: boolean;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankAccountRut: string | null;
  bankAccountEmail: string | null;
  /** Fragmento libre del admin que se añade al correo de bienvenida del alumno */
  welcomeEmailCustomBody: string;
  createdAt: Date;
  updatedAt: Date;
}
