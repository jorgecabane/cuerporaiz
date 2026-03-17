/**
 * Estados de reserva y entidad de dominio.
 * Sin referencias a Prisma ni a infraestructura.
 */
import type { UserId } from "./user";
import type { LiveClassId } from "./live-class";

export type ReservationStatus = "CONFIRMED" | "CANCELLED" | "LATE_CANCELLED" | "ATTENDED" | "NO_SHOW";

export type ReservationId = string;

export interface Reservation {
  id: ReservationId;
  userId: UserId;
  liveClassId: LiveClassId;
  userPlanId: string | null;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  LATE_CANCELLED: "Cancelada tarde",
  ATTENDED: "Asistió",
  NO_SHOW: "No-show",
};
