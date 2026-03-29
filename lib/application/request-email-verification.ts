import type { IAuthTokenRepository } from "@/lib/ports/auth-token-repository";
import { generateSecureToken } from "@/lib/domain/auth-token";

export async function requestEmailVerification(
  userId: string,
  tokenRepo: IAuthTokenRepository,
): Promise<string> {
  await tokenRepo.invalidateEmailVerificationTokens(userId);
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await tokenRepo.createEmailVerificationToken(userId, token, expiresAt);
  return token;
}
