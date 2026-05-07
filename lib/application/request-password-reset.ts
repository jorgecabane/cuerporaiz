import type { IAuthTokenRepository } from "@/lib/ports/auth-token-repository";
import type { IUserRepository } from "@/lib/ports/user-repository";
import { generateSecureToken } from "@/lib/domain/auth-token";

interface RequestPasswordResetDeps {
  tokenRepo: IAuthTokenRepository;
  userRepo: IUserRepository;
}

interface RequestPasswordResetResult {
  success: boolean;
  token?: string;
  userId?: string;
}

export async function requestPasswordReset(
  email: string,
  centerId: string,
  deps: RequestPasswordResetDeps,
): Promise<RequestPasswordResetResult> {
  const user = await deps.userRepo.findByEmail(email);
  if (!user) return { success: true }; // Don't reveal if email exists

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await deps.tokenRepo.invalidatePasswordResetTokens(user.id);
  await deps.tokenRepo.createPasswordResetToken(user.id, token, expiresAt);

  return { success: true, token, userId: user.id };
}

/**
 * Genera un token de password-reset con vigencia extendida (default 7 días),
 * para flujos de invitación: estudiante creado por admin, profe nuevo, etc.
 * El usuario recibe un link que lo lleva a /auth/reset-password donde define
 * su contraseña por primera vez.
 */
export async function requestInvitationToken(
  userId: string,
  tokenRepo: IAuthTokenRepository,
  expiresInDays = 7,
): Promise<string> {
  await tokenRepo.invalidatePasswordResetTokens(userId);
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await tokenRepo.createPasswordResetToken(userId, token, expiresAt);
  return token;
}
