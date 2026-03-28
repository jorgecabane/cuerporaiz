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

  // TODO: also check user belongs to center via UserCenterRole
  // For now, we proceed if user exists by email

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await deps.tokenRepo.invalidatePasswordResetTokens(user.id);
  await deps.tokenRepo.createPasswordResetToken(user.id, token, expiresAt);

  return { success: true, token, userId: user.id };
}
