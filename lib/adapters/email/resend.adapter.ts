import type { IEmailProvider } from "@/lib/ports";
import type { SendEmailDto, SendEmailResultDto } from "@/lib/dto/email-dto";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

function getClient(): Resend {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está definida. Configurá la variable de entorno.");
  }
  return new Resend(apiKey);
}

/**
 * Adapter que implementa IEmailProvider usando la API de Resend.
 * Traduce SendEmailDto ↔ formato Resend; la aplicación no conoce tipos de Resend.
 */
export const resendEmailAdapter: IEmailProvider = {
  async send(dto: SendEmailDto): Promise<SendEmailResultDto> {
    const resend = getClient();
    const payload = {
      from: dto.from,
      to: dto.to,
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
      reply_to: dto.replyTo,
      cc: dto.cc,
      bcc: dto.bcc,
    };
    const { data, error } = await resend.emails.send(payload);
    if (error) {
      return {
        success: false,
        error: error.message ?? "Error al enviar el email",
      };
    }
    return {
      success: true,
      id: data?.id,
    };
  },
};
