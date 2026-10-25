import type { IEmailProvider } from "@/lib/ports";
import type { SendEmailDto, SendEmailResultDto } from "@/lib/dto/email-dto";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

function getClient(): Resend {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está definida. Configura la variable de entorno.");
  }
  return new Resend(apiKey);
}

/**
 * La cuenta de Resend acepta 10 requests/s; una ráfaga (p.ej. el aviso del blog a
 * todos los alumnos) excede el límite y Resend rechaza el resto. Espaciamos los envíos
 * de esta instancia y, si otra instancia gastó el cupo, reintentamos.
 */
const MIN_GAP_MS = 125; // 8/s, bajo el límite de 10/s
const RATE_LIMIT_RETRIES = 5;
const RETRY_DELAY_MS = 1_000;
let nextSlotAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ponytail: cola por instancia; con varias instancias en paralelo cubren los reintentos.
async function waitForSlot(): Promise<void> {
  const now = Date.now();
  const at = Math.max(now, nextSlotAt);
  nextSlotAt = at + MIN_GAP_MS;
  if (at > now) await sleep(at - now);
}

async function sendInSlot(resend: Resend, payload: Parameters<Resend["emails"]["send"]>[0]) {
  await waitForSlot();
  return resend.emails.send(payload);
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
    let result = await sendInSlot(resend, payload);
    for (let i = 0; i < RATE_LIMIT_RETRIES && result.error?.name === "rate_limit_exceeded"; i++) {
      await sleep(RETRY_DELAY_MS);
      result = await sendInSlot(resend, payload);
    }
    const { data, error } = result;
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
