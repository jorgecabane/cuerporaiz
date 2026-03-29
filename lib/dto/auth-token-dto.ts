import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
  centerId: z.string().min(1, "Centro requerido"),
});
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
});
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;

export const resendVerificationSchema = z.object({});
export type ResendVerificationBody = z.infer<typeof resendVerificationSchema>;
