import type { IAuthService, AuthResult } from "@/lib/ports";
import type { CenterId } from "@/lib/domain/user";
import type { Role } from "@/lib/domain/role";
import bcrypt from "bcryptjs";
import { userRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";

const SALT_ROUNDS = 12;

export const authService: IAuthService = {
  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  },

  async verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  },

  async authenticateWithCredentials(
    email: string,
    password: string,
    centerId: CenterId
  ): Promise<AuthResult> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }
    const membership = await prisma.userCenterRole.findFirst({
      where: { userId: user.id, centerId },
      include: { center: true },
    });
    if (!membership) {
      throw new Error("USER_NOT_IN_CENTER");
    }
    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser) {
      throw new Error("USER_NOT_FOUND");
    }
    const valid = await this.verifyPassword(password, fullUser.passwordHash);
    if (!valid) {
      throw new Error("INVALID_CREDENTIALS");
    }
    return {
      user,
      role: membership.role as unknown as Role,
      centerId: membership.centerId as CenterId,
    };
  },
};
