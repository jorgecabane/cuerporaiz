import type { IInstructorRepository, Instructor, CreateInstructorInput, UpdateInstructorInput } from "@/lib/ports";
import { randomBytes } from "crypto";
import { prisma } from "./prisma";

function toDomain(
  role: { id: string; centerId: string; createdAt: Date },
  user: { id: string; name: string | null; email: string; imageUrl?: string | null },
): Instructor {
  return {
    id: role.id,
    userId: user.id,
    centerId: role.centerId,
    name: user.name,
    email: user.email,
    imageUrl: user.imageUrl ?? null,
    active: true,
    createdAt: role.createdAt,
  };
}

export const instructorRepository: IInstructorRepository = {
  async findByCenterId(centerId) {
    const roles = await prisma.userCenterRole.findMany({
      where: { centerId, role: "INSTRUCTOR" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
    return roles.map((r) => toDomain(r, r.user));
  },

  async findById(id, centerId) {
    const role = await prisma.userCenterRole.findFirst({
      where: { id, centerId, role: "INSTRUCTOR" },
      include: { user: true },
    });
    return role ? toDomain(role, role.user) : null;
  },

  async create(centerId, data) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });

    if (existing) {
      const updatedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(data.name != null && { name: data.name }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl && data.imageUrl !== "" ? data.imageUrl : null }),
        },
      });
      const role = await prisma.userCenterRole.create({
        data: { userId: existing.id, centerId, role: "INSTRUCTOR" },
        include: { user: true },
      });
      return toDomain(role, updatedUser);
    }

    const passwordHash = randomBytes(32).toString("hex");
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        ...(data.imageUrl != null && data.imageUrl !== "" && { imageUrl: data.imageUrl }),
      },
    });
    const role = await prisma.userCenterRole.create({
      data: { userId: newUser.id, centerId, role: "INSTRUCTOR" },
    });
    return toDomain(role, newUser);
  },

  async update(id, centerId, data) {
    const role = await prisma.userCenterRole.findFirst({
      where: { id, centerId, role: "INSTRUCTOR" },
      include: { user: true },
    });
    if (!role) return null;

    const user = await prisma.user.update({
      where: { id: role.userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl && data.imageUrl !== "" ? data.imageUrl : null }),
      },
    });
    return toDomain(role, user);
  },

  async deactivate(id, centerId) {
    const { count } = await prisma.userCenterRole.deleteMany({
      where: { id, centerId, role: "INSTRUCTOR" },
    });
    return count > 0;
  },
};
