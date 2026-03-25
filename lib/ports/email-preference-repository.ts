import type { EmailPreference, EmailPreferenceType } from "@/lib/domain/email-preference";

export interface UpsertEmailPreferenceInput {
  userId: string;
  centerId: string;
  classReminder?: boolean;
  spotFreed?: boolean;
  planExpiring?: boolean;
  reservationConfirm?: boolean;
  purchaseConfirm?: boolean;
}

export interface IEmailPreferenceRepository {
  findByUserAndCenter(userId: string, centerId: string): Promise<EmailPreference | null>;
  upsert(input: UpsertEmailPreferenceInput): Promise<EmailPreference>;
  isEnabled(userId: string, centerId: string, type: EmailPreferenceType): Promise<boolean>;
}
