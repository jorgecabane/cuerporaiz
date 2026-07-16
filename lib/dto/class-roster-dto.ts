/**
 * DTOs para el roster de compañeros registrados en una clase (vista alumno).
 * Sin email — a diferencia de ClassAttendanceDto (staff).
 */
import { z } from "zod";

export const classRosterQuerySchema = z.object({
  liveClassId: z.string().min(1, "liveClassId requerido"),
});

export type ClassRosterQuery = z.infer<typeof classRosterQuerySchema>;

export interface ClassRosterEntryDto {
  userId: string;
  name: string | null;
  lastName: string | null;
  imageUrl: string | null;
}
