import type { IAuthTokenRepository } from "@/lib/ports/auth-token-repository";
import { isTokenValid } from "@/lib/domain/auth-token";
import { prisma } from "@/lib/adapters/db/prisma";

interface VerifyEmailResult {
  success: boolean;
  code: "VERIFIED" | "INVALID_TOKEN" | "EXPIRED_TOKEN";
  userId?: string;
}

export async function verifyEmail(
  token: string,
  tokenRepo: IAuthTokenRepository,
): Promise<VerifyEmailResult> {
  const verificationToken = await tokenRepo.findEmailVerificationByToken(token);
  if (!verificationToken) return { success: false, code: "INVALID_TOKEN" };
  if (!isTokenValid(verificationToken)) {
    return {
      success: false,
      code: verificationToken.usedAt ? "INVALID_TOKEN" : "EXPIRED_TOKEN",
    };
  }

  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerifiedAt: new Date() },
  });
  await tokenRepo.markEmailVerificationUsed(verificationToken.id);

  return { success: true, code: "VERIFIED", userId: verificationToken.userId };
}
