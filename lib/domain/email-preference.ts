export interface EmailPreference {
  id: string;
  userId: string;
  centerId: string;
  classReminder: boolean;
  spotFreed: boolean;
  planExpiring: boolean;
  reservationConfirm: boolean;
  purchaseConfirm: boolean;
  lessonUnlocked: boolean;
  quotaExhausted: boolean;
  newContent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Keys that can be toggled by the user */
export type EmailPreferenceType = keyof Pick<
  EmailPreference,
  | "classReminder"
  | "spotFreed"
  | "planExpiring"
  | "reservationConfirm"
  | "purchaseConfirm"
  | "lessonUnlocked"
  | "quotaExhausted"
  | "newContent"
>;

export const EMAIL_PREFERENCE_LABELS: Record<EmailPreferenceType, string> = {
  classReminder: "Recordatorio de clase",
  spotFreed: "Cupo liberado",
  planExpiring: "Plan por vencer",
  reservationConfirm: "Confirmación de reserva",
  purchaseConfirm: "Confirmación de compra",
  lessonUnlocked: "Lección desbloqueada",
  quotaExhausted: "Cuota agotada",
  newContent: "Nuevo contenido",
};
