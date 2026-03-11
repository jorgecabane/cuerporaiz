/**
 * DTOs para el port de email. La aplicación trabaja solo con estos tipos;
 * ningún tipo de Resend (ni de otro proveedor) debe usarse fuera del adapter.
 */
import { z } from "zod";

/** DTO de entrada para enviar un email */
export interface SendEmailDto {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string[];
  cc?: string[];
  bcc?: string[];
}

export const sendEmailDtoSchema = z.object({
  from: z.string().min(1, "From requerido"),
  to: z.array(z.string().email()).min(1, "Al menos un destinatario"),
  subject: z.string().min(1, "Asunto requerido"),
  html: z.string().min(1, "Contenido HTML requerido"),
  text: z.string().optional(),
  replyTo: z.array(z.string().email()).optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
});

/** DTO de resultado del envío (independiente del proveedor) */
export interface SendEmailResultDto {
  success: boolean;
  id?: string;
  error?: string;
}
