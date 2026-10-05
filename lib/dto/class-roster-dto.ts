/**
 * DTOs para el roster de compañeros registrados en una clase (vista alumno).
 * Sin email — a diferencia de ClassAttendanceDto (staff).
 */
import { z } from "zod";

export const classRosterQuerySchema = z.object({
  liveClassId: z.string().min(1, "liveClassId requerido"),
});

export type ClassRosterQuery = z.infer<typeof classRosterQuerySchema>;

/** `?liveClassIds=a,b,c` (calendario: todas las clases del día en una llamada). */
export const MAX_BATCH_CLASS_IDS = 50;
export const liveClassIdsQuerySchema = z
  .string()
  .transform((raw) => [...new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))])
  .pipe(z.array(z.string().min(1)).min(1).max(MAX_BATCH_CLASS_IDS));

export interface ClassRosterEntryDto {
  userId: string;
  name: string | null;
  lastName: string | null;
  imageUrl: string | null;
}
