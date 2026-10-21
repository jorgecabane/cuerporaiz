/**
 * Asistentes opcionales de una compra de evento online. Cada elemento es un
 * cupo adicional (2…N); el cupo 1 es siempre el comprador.
 */
import { z } from "zod";

const optionalName = z
  .preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(120).optional())
  .transform((v) => v || null);

const optionalEmail = z
  .preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.union([z.literal(""), z.string().email().max(200)]).optional()
  )
  .transform((v) => v || null);

export const eventAttendeesSchema = z
  .array(z.object({ name: optionalName, email: optionalEmail }))
  .max(199)
  .optional();

export type EventAttendeesBody = z.infer<typeof eventAttendeesSchema>;
