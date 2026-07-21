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
  /**
   * True cuando la reserva consumió el cupo de clase de prueba del usuario.
   * Una clase puede aceptar trials y al mismo tiempo recibir reservas con plan;
   * este flag distingue la reserva trial específica.
   */
  isTrial: boolean;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * True si el alumno puede volver a reservar una clase donde ya tiene una fila.
 *
 * La tabla tiene @@unique([userId, liveClassId]): cancelar no borra la fila, la
 * deja en CANCELLED/LATE_CANCELLED. Sin este predicado, esa fila bloquea la
 * re-reserva para siempre aunque la clase esté vacía.
 *
 * ATTENDED y NO_SHOW no se reactivan: solo existen en clases ya pasadas, que el
 * use case rechaza antes con CLASS_PAST.
 */
export function canRebookReservation(status: ReservationStatus): boolean {
  return status === "CANCELLED" || status === "LATE_CANCELLED";
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  LATE_CANCELLED: "Cancelada tarde",
  ATTENDED: "Asistió",
  NO_SHOW: "No-show",
};
