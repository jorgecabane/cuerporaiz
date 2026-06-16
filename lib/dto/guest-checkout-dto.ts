/**
 * DTO para el checkout de eventos SIN autenticación (guest checkout).
 * Captura los datos mínimos del comprador para registrar quién asiste y
 * cuántas entradas lleva. El email se normaliza a minúsculas.
 */
import { z } from "zod";

export const guestCheckoutBodySchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre").max(120),
  email: z.string().trim().toLowerCase().email("Email inválido").max(200),
  phone: z.string().trim().min(6, "Ingresa un teléfono válido").max(30),
  quantity: z.number().int().min(1).max(200),
});

export type GuestCheckoutBody = z.infer<typeof guestCheckoutBodySchema>;
