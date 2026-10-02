/**
 * Envío de emails que nunca lanza (loguea y sigue).
 *
 * El envío arranca de inmediato y se registra en after(): en Vercel la function
 * no se congela antes de que el fetch a Resend termine. after() solo tiene
 * efecto si se registra mientras el request sigue vivo; si lo llamas desde
 * trabajo que corre después de responder, envuélvelo en runInBackground() y
 * espera esta promesa (ver notify-event-ticket-confirmation).
 */
import { resendEmailAdapter } from "@/lib/adapters/email";
import type { SendEmailDto } from "@/lib/dto/email-dto";
import { runAfterResponse } from "@/lib/utils/run-after-response";

async function deliverEmail(dto: SendEmailDto): Promise<void> {
  try {
    const result = await resendEmailAdapter.send(dto);
    if (result.success) {
      console.log("[Email] Sent:", result.id, "to:", dto.to, "subject:", dto.subject);
    } else {
      console.error("[Email] Error:", result.error, "to:", dto.to, "subject:", dto.subject);
    }
  } catch (err) {
    console.error("[Email] Exception:", err, "to:", dto.to, "subject:", dto.subject);
  }
}

export function sendEmailSafe(dto: SendEmailDto): Promise<void> {
  const delivery = deliverEmail(dto);
  runAfterResponse(delivery);
  return delivery;
}
