/**
 * DTOs en el límite de la API de autenticación.
 * Validar con Zod al recibir; no exponer entidades ni passwordHash.
 */
import { z } from "zod";
import { ROLES } from "@/lib/domain";

export const loginBodySchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
  centerId: z.string().min(1, "Centro requerido"),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const signupBodySchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  name: z.string().max(200).optional(),
  centerId: z.string().min(1, "Centro requerido"),
  role: z.enum(ROLES).optional(),
});

export type SignupBody = z.infer<typeof signupBodySchema>;

export interface SessionUserDto {
  id: string;
  email: string;
  name: string | null;
  role: string;
  centerId: string;
}
