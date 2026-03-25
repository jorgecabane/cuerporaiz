import { emailPreferenceRepository } from "@/lib/adapters/db";
import type { EmailPreference, EmailPreferenceType } from "@/lib/domain/email-preference";

/** Pure function for testing — checks preference without DB */
export function shouldSendEmailPure(
  pref: EmailPreference | null,
  type: EmailPreferenceType
): boolean {
  if (!pref) return true;
  return pref[type];
}

/** Async version that queries the DB */
export async function shouldSendEmail(
  userId: string,
  centerId: string,
  type: EmailPreferenceType
): Promise<boolean> {
  return emailPreferenceRepository.isEnabled(userId, centerId, type);
}
