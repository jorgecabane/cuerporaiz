import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  rut: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(), // ISO date string
  sex: z.enum(["M", "F", "X"]).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateEmailPreferencesSchema = z.object({
  classReminder: z.boolean().optional(),
  spotFreed: z.boolean().optional(),
  planExpiring: z.boolean().optional(),
  reservationConfirm: z.boolean().optional(),
  purchaseConfirm: z.boolean().optional(),
});
export type UpdateEmailPreferencesInput = z.infer<typeof updateEmailPreferencesSchema>;
