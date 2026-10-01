import { z } from "zod";

export const subscribeNewsletterSchema = z.object({
  email: z.string().trim().email("Ingresa un email válido").max(254),
  /** Honeypot: campo oculto que solo llenan los bots. */
  website: z.string().max(200).optional(),
});
export type SubscribeNewsletterInput = z.infer<typeof subscribeNewsletterSchema>;
