/**
 * DTOs para waitlist (lista de espera) de clases y eventos.
 * Validar con Zod en el borde (API).
 */
import { z } from "zod";
import type { WaitlistStatus } from "@/lib/domain/waitlist";

// ─── Body de POST /api/waitlist ─────────────────────────────────────────────
export const joinWaitlistBodySchema = z.object({
  kind: z.enum(["class", "event"]),
  itemId: z.string().min(1, "itemId requerido"),
});

export type JoinWaitlistBody = z.infer<typeof joinWaitlistBodySchema>;

// ─── Body de POST /api/waitlist/[entryId]/promote ───────────────────────────
// El entryId viene en la URL; el body queda opcional para futuros parámetros.
export const promoteWaitlistBodySchema = z.object({}).optional().default({});

export type PromoteWaitlistBody = z.infer<typeof promoteWaitlistBodySchema>;

// ─── Query GET /api/admin/waitlist ──────────────────────────────────────────
// Exactamente uno de liveClassId o eventId debe estar presente.
export const adminListWaitlistQuerySchema = z
  .object({
    liveClassId: z.string().min(1).optional(),
    eventId: z.string().min(1).optional(),
  })
  .refine(
    (q) => (q.liveClassId === undefined) !== (q.eventId === undefined),
    {
      message: "Debes especificar exactamente uno de liveClassId o eventId",
    }
  );

export type AdminListWaitlistQuery = z.infer<typeof adminListWaitlistQuerySchema>;

// ─── Response DTOs ──────────────────────────────────────────────────────────
export interface WaitlistEntryDto {
  id: string;
  userId: string;
  kind: "class" | "event";
  itemId: string;
  status: WaitlistStatus;
  position: number;
  notifiedAt: string | null;
  heldUntil: string | null;
  createdAt: string;
  // Datos hidratados del item para UI (opcional según endpoint)
  itemTitle?: string;
  itemStartsAt?: string;
}

export interface WaitlistEntryWithUserDto extends WaitlistEntryDto {
  user: {
    id: string;
    name: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface JoinWaitlistResultDto {
  success: true;
  entry: WaitlistEntryDto;
}

export interface WaitlistErrorDto {
  success: false;
  code: string;
  message: string;
}

export type JoinWaitlistResult = JoinWaitlistResultDto | WaitlistErrorDto;
