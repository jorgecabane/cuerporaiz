import type { PasswordResetToken, EmailVerificationToken } from "@/lib/domain/auth-token";

export interface IAuthTokenRepository {
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  findPasswordResetByToken(token: string): Promise<PasswordResetToken | null>;
  markPasswordResetUsed(id: string): Promise<void>;
  invalidatePasswordResetTokens(userId: string): Promise<void>;

  createEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<EmailVerificationToken>;
  findEmailVerificationByToken(token: string): Promise<EmailVerificationToken | null>;
  markEmailVerificationUsed(id: string): Promise<void>;
  invalidateEmailVerificationTokens(userId: string): Promise<void>;
}
