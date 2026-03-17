/**
 * DTOs para reservas y clases en vivo.
 * Validar con Zod en el borde (API/Server Action).
 */
import { z } from "zod";
import type { ReservationStatus } from "@/lib/domain";

const reservationStatusSchema = z.enum([
  "CONFIRMED",
  "CANCELLED",
  "LATE_CANCELLED",
  "ATTENDED",
  "NO_SHOW",
]);

// ─── Query GET /api/reservations ───────────────────────────────────────────
/** Parsea query param statuses (ej. "CONFIRMED,CANCELLED,LATE_CANCELLED"). Sin param = todas. */
export const listReservationsQuerySchema = z.object({
  statuses: z
    .string()
    .optional()
    .transform((s, ctx): ReservationStatus[] | undefined => {
      if (!s) return undefined;
      const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
      if (parts.length === 0) return undefined;
      const parsed = z.array(reservationStatusSchema).safeParse(parts);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "statuses contiene valores inválidos",
        });
        return z.NEVER;
      }
      return parsed.data;
    }),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;

// ─── Request (validables) ─────────────────────────────────────────────────
export const reserveClassBodySchema = z.object({
  liveClassId: z.string().min(1, "liveClassId requerido"),
  userPlanId: z.string().min(1).optional(),
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
  isTrialClass?: boolean;
  /** Si la clase es online (meetingUrl) o presencial */
  isOnline?: boolean;
  /** Nombre del profesor que imparte la clase */
  instructorName?: string | null;
  /** URL de la imagen del profesor (avatar) */
  instructorImageUrl?: string | null;
}

export interface ReservationDto {
  id: string;
  userId: string;
  liveClassId: string;
  userPlanId: string | null;
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

export interface UserPlanOptionDto {
  id: string;
  planId: string;
  planName?: string;
  classesTotal: number | null;
  classesUsed: number;
  validUntil: string | null;
}

export interface ReservationErrorDto {
  success: false;
  code: string;
  message: string;
  plans?: UserPlanOptionDto[];
}

export type ReserveClassResult = ReserveClassResultDto | ReservationErrorDto;
export type CancelReservationResult = CancelReservationResultDto | ReservationErrorDto;
