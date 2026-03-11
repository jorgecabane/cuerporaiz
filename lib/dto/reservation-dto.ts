/**
 * DTOs para reservas y clases en vivo.
 * Validar con Zod en el borde (API/Server Action).
 */
import { z } from "zod";
import type { ReservationStatus } from "@/lib/domain";

// ─── Request (validables) ─────────────────────────────────────────────────
export const reserveClassBodySchema = z.object({
  liveClassId: z.string().min(1, "liveClassId requerido"),
});

export type ReserveClassBody = z.infer<typeof reserveClassBodySchema>;

export const cancelReservationBodySchema = z.object({
  reservationId: z.string().min(1, "reservationId requerido"),
});

export type CancelReservationBody = z.infer<typeof cancelReservationBodySchema>;

// ─── Response ─────────────────────────────────────────────────────────────
export interface LiveClassDto {
  id: string;
  centerId: string;
  title: string;
  startsAt: string; // ISO
  durationMinutes: number;
  maxCapacity: number;
  spotsLeft: number; // derivado: maxCapacity - reservas CONFIRMED
}

export interface ReservationDto {
  id: string;
  userId: string;
  liveClassId: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  liveClass?: LiveClassDto;
}

export interface ReserveClassResultDto {
  success: true;
  reservation: ReservationDto;
}

export interface CancelReservationResultDto {
  success: true;
  reservation: ReservationDto;
}

export interface ReservationErrorDto {
  success: false;
  code: string;
  message: string;
}

export type ReserveClassResult = ReserveClassResultDto | ReservationErrorDto;
export type CancelReservationResult = CancelReservationResultDto | ReservationErrorDto;
