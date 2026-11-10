/**
 * DTOs para el port de email. La aplicación trabaja solo con estos tipos;
 * ningún tipo de Resend (ni de otro proveedor) debe usarse fuera del adapter.
 */

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

/** DTO de resultado del envío (independiente del proveedor) */
export interface SendEmailResultDto {
  success: boolean;
  id?: string;
  error?: string;
}
