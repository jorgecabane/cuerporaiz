import type { ILoginAttemptRepository } from "@/lib/ports/login-attempt-repository";
import type { LoginAttempt } from "@/lib/domain/auth-token";
import { prisma } from "./prisma";
import type { LoginAttempt as PrismaLoginAttempt } from "@prisma/client";

function toLoginAttempt(r: PrismaLoginAttempt): LoginAttempt {
  return {
    id: r.id,
    email: r.email,
    centerId: r.centerId,
    ip: r.ip,
    success: r.success,
    createdAt: r.createdAt,
  };
}

export const loginAttemptRepository: ILoginAttemptRepository = {
  async create(data) {
    const r = await prisma.loginAttempt.create({ data });
    return toLoginAttempt(r);
  },

  async countRecentByEmailAndCenter(email, centerId, sinceMinutes) {
    return prisma.loginAttempt.count({
      where: {
        email,
        centerId,
        createdAt: { gte: new Date(Date.now() - sinceMinutes * 60000) },
      },
    });
  },

  async countRecentByIp(ip, sinceMinutes) {
    return prisma.loginAttempt.count({
      where: {
        ip,
        createdAt: { gte: new Date(Date.now() - sinceMinutes * 60000) },
      },
    });
  },
};
