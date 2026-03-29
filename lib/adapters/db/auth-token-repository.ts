import type { IAuthTokenRepository } from "@/lib/ports/auth-token-repository";
import type { PasswordResetToken, EmailVerificationToken } from "@/lib/domain/auth-token";
import { prisma } from "./prisma";
import type {
  PasswordResetToken as PrismaPasswordResetToken,
  EmailVerificationToken as PrismaEmailVerificationToken,
} from "@prisma/client";

function toPasswordResetToken(r: PrismaPasswordResetToken): PasswordResetToken {
  return {
    id: r.id,
    userId: r.userId,
    token: r.token,
    expiresAt: r.expiresAt,
    usedAt: r.usedAt,
    createdAt: r.createdAt,
  };
}

function toEmailVerificationToken(r: PrismaEmailVerificationToken): EmailVerificationToken {
  return {
    id: r.id,
    userId: r.userId,
    token: r.token,
    expiresAt: r.expiresAt,
    usedAt: r.usedAt,
    createdAt: r.createdAt,
  };
}

export const authTokenRepository: IAuthTokenRepository = {
  async createPasswordResetToken(userId, token, expiresAt) {
    const r = await prisma.passwordResetToken.create({ data: { userId, token, expiresAt } });
    return toPasswordResetToken(r);
  },

  async findPasswordResetByToken(token) {
    const r = await prisma.passwordResetToken.findUnique({ where: { token } });
    return r ? toPasswordResetToken(r) : null;
  },

  async markPasswordResetUsed(id) {
    await prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  },

  async invalidatePasswordResetTokens(userId) {
    await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },

  async createEmailVerificationToken(userId, token, expiresAt) {
    const r = await prisma.emailVerificationToken.create({ data: { userId, token, expiresAt } });
    return toEmailVerificationToken(r);
  },

  async findEmailVerificationByToken(token) {
    const r = await prisma.emailVerificationToken.findUnique({ where: { token } });
    return r ? toEmailVerificationToken(r) : null;
  },

  async markEmailVerificationUsed(id) {
    await prisma.emailVerificationToken.update({ where: { id }, data: { usedAt: new Date() } });
  },

  async invalidateEmailVerificationTokens(userId) {
    await prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },
};
