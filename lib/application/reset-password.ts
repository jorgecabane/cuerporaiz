import type { IAuthTokenRepository } from "@/lib/ports/auth-token-repository";
import { isTokenValid } from "@/lib/domain/auth-token";
import { prisma } from "@/lib/adapters/db/prisma";

interface ResetPasswordDeps {
  tokenRepo: IAuthTokenRepository;
  hashPassword: (password: string) => Promise<string>;
}

interface ResetPasswordResult {
  success: boolean;
  code: "PASSWORD_RESET" | "INVALID_TOKEN" | "EXPIRED_TOKEN";
}

export async function resetPassword(
  token: string,
  newPassword: string,
  deps: ResetPasswordDeps,
): Promise<ResetPasswordResult> {
  const resetToken = await deps.tokenRepo.findPasswordResetByToken(token);
  if (!resetToken) return { success: false, code: "INVALID_TOKEN" };
  if (!isTokenValid(resetToken)) {
    return { success: false, code: resetToken.usedAt ? "INVALID_TOKEN" : "EXPIRED_TOKEN" };
  }

  const hash = await deps.hashPassword(newPassword);
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash: hash, tokenVersion: { increment: 1 } },
  });
  await deps.tokenRepo.markPasswordResetUsed(resetToken.id);

  return { success: true, code: "PASSWORD_RESET" };
}
