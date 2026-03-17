/**
 * Wrapper fire-and-forget para envio de emails.
 * No lanza errores: loguea a console y sigue.
 */
import { resendEmailAdapter } from "@/lib/adapters/email";
import type { SendEmailDto } from "@/lib/dto/email-dto";

export async function sendEmailSafe(dto: SendEmailDto): Promise<void> {
  try {
    const result = await resendEmailAdapter.send(dto);
    if (!result.success) {
      console.error("[Email] Error:", result.error, "to:", dto.to);
    }
  } catch (err) {
    console.error("[Email] Exception:", err);
  }
}
