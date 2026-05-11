/**
 * Programa el envío de email vía after() para que se ejecute después de la
 * response. En Vercel corre vía waitUntil — la function no se congela antes
 * de que el fetch a Resend complete. Nunca lanza: loguea y sigue.
 */
import { after } from "next/server";
import { resendEmailAdapter } from "@/lib/adapters/email";
import type { SendEmailDto } from "@/lib/dto/email-dto";

export async function sendEmailSafe(dto: SendEmailDto): Promise<void> {
  after(async () => {
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
  });
}
