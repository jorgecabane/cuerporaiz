import type { IUserRepository, CreateUserInput } from "@/lib/ports";
import type { User } from "@/lib/domain";
import type { Role } from "@/lib/domain/role";
import type { CenterId } from "@/lib/domain/user";
import { prisma } from "./prisma";
import type { Role as PrismaRole, UserCenterRole } from "@prisma/client";

function toDomainRole(r: PrismaRole): Role {
  return r as unknown as Role;
}

function toDomainUser(u: {
  id: string;
  email: string;
  name: string | null;
  lastName: string | null;
  phone: string | null;
  rut: string | null;
  birthday: Date | null;
  sex: string | null;
  imageUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    lastName: u.lastName,
    phone: u.phone,
    rut: u.rut,
    birthday: u.birthday,
    sex: u.sex,
    imageUrl: u.imageUrl,
    notes: u.notes,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export const userRepository: IUserRepository = {
  async create(data: CreateUserInput) {
    const u = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name ?? null,
        phone: data.phone ?? null,
      },
    });
    return toDomainUser(u);
  },

  async findByEmail(email: string) {
    const u = await prisma.user.findUnique({ where: { email } });
    return u ? toDomainUser(u) : null;
  },

  async findAuthSummaryByEmail(email: string) {
    const u = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, phone: true, passwordHash: true, emailVerifiedAt: true },
    });
    if (!u) return null;
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      hasPassword: u.passwordHash !== "",
      emailVerified: u.emailVerifiedAt !== null,
    };
  },

  async findAuthSummaryById(userId: string) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, passwordHash: true, emailVerifiedAt: true },
    });
    if (!u) return null;
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      hasPassword: u.passwordHash !== "",
      emailVerified: u.emailVerifiedAt !== null,
    };
  },

  async setPasswordAndVerify(userId: string, passwordHash: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        emailVerifiedAt: { set: new Date() },
        tokenVersion: { increment: 1 },
      },
    });
  },

  async updateGuestProfile(userId: string, data: { name?: string; phone?: string }) {
    const patch: { name?: string; phone?: string } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (Object.keys(patch).length === 0) return;
    await prisma.user.update({ where: { id: userId }, data: patch });
  },

  async findById(id: string) {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? toDomainUser(u) : null;
  },

  async findManyByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const list = await prisma.user.findMany({
      where: { id: { in: ids } },
    });
    return list.map(toDomainUser);
  },

  async findByIdWithMemberships(id: string) {
    const u = await prisma.user.findUnique({
      where: { id },
      include: { memberships: true },
    });
    if (!u) return null;
    return {
      ...toDomainUser(u),
      memberships: u.memberships.map((m: UserCenterRole) => ({ centerId: m.centerId as CenterId, role: toDomainRole(m.role) })),
    };
  },

  async findManyByCenterId(centerId: CenterId) {
    const memberships = await prisma.userCenterRole.findMany({
      where: { centerId },
      include: { user: true },
      orderBy: { user: { email: "asc" } },
    });
    return memberships.map((m) => ({
      ...toDomainUser(m.user),
      role: toDomainRole(m.role),
    }));
  },

  async findMembership(userId: string, centerId: CenterId) {
    const m = await prisma.userCenterRole.findUnique({
      where: { userId_centerId: { userId, centerId } },
      select: { role: true, isLegacyClient: true },
    });
    return m ? { role: toDomainRole(m.role), isLegacyClient: m.isLegacyClient } : null;
  },

  async addRole(userId: string, centerId: CenterId, role: Role) {
    await prisma.userCenterRole.create({
      data: { userId, centerId, role: role as unknown as PrismaRole },
    });
  },

  async setLegacyClient(userId: string, centerId: CenterId, isLegacyClient: boolean) {
    await prisma.userCenterRole.update({
      where: { userId_centerId: { userId, centerId } },
      data: { isLegacyClient },
    });
  },
};
