import { emailPreferenceRepository } from "@/lib/adapters/db";
import type { EmailPreferenceType } from "@/lib/domain/email-preference";

/** Async version that queries the DB */
export async function shouldSendEmail(
  userId: string,
  centerId: string,
  type: EmailPreferenceType
): Promise<boolean> {
  return emailPreferenceRepository.isEnabled(userId, centerId, type);
}
