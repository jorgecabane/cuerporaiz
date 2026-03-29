import crypto from "crypto";

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface LoginAttempt {
  id: string;
  email: string;
  centerId: string;
  ip: string;
  success: boolean;
  createdAt: Date;
}

/** Generate a cryptographically secure 64-char hex token */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Check if a token is valid (not expired, not used) */
export function isTokenValid(
  token: { expiresAt: Date; usedAt: Date | null },
  now = new Date(),
): boolean {
  if (token.usedAt) return false;
  if (token.expiresAt < now) return false;
  return true;
}
