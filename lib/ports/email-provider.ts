import type { SendEmailDto, SendEmailResultDto } from "@/lib/dto/email-dto";

/**
 * Port para envío de emails. La aplicación depende de esta interfaz;
 * el adapter (Resend u otro) implementa el contrato sin exponer tipos del proveedor.
 */
export interface IEmailProvider {
  send(dto: SendEmailDto): Promise<SendEmailResultDto>;
}
