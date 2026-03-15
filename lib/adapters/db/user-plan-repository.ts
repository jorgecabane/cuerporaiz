import type { IUserPlanRepository, CreateUserPlanInput } from "@/lib/ports/user-plan-repository";
import type { UserPlan, UserPlanStatus } from "@/lib/domain/user-plan";
import { prisma } from "./prisma";
import { UserPlanStatus as PrismaUserPlanStatus } from "@/lib/generated/prisma";

function toDomain(r: {
  id: string;
  userId: string;
  planId: string;
  centerId: string;
  orderId: string | null;
  status: PrismaUserPlanStatus;
  classesTotal: number | null;
  classesUsed: number;
  validFrom: Date;
  validUntil: Date | null;
  frozenAt: Date | null;
  unfrozenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserPlan {
  return {
    id: r.id,
    userId: r.userId,
    planId: r.planId,
    centerId: r.centerId,
    orderId: r.orderId,
    status: r.status as unknown as UserPlanStatus,
    classesTotal: r.classesTotal,
    classesUsed: r.classesUsed,
    validFrom: r.validFrom,
    validUntil: r.validUntil,
    frozenAt: r.frozenAt,
    unfrozenAt: r.unfrozenAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const userPlanRepository: IUserPlanRepository = {
  async create(data: CreateUserPlanInput) {
    const r = await prisma.userPlan.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        centerId: data.centerId,
        orderId: data.orderId ?? null,
        classesTotal: data.classesTotal ?? null,
        validFrom: data.validFrom ?? new Date(),
        validUntil: data.validUntil ?? null,
      },
    });
    return toDomain(r);
  },

  async findById(id: string) {
    const r = await prisma.userPlan.findUnique({ where: { id } });
    return r ? toDomain(r) : null;
  },

  async findActiveByUserAndCenter(userId: string, centerId: string) {
    const list = await prisma.userPlan.findMany({
      where: {
        userId,
        centerId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });
    return list.map(toDomain);
  },

  async findByUserAndCenter(userId: string, centerId: string) {
    const list = await prisma.userPlan.findMany({
      where: { userId, centerId },
      orderBy: { createdAt: "desc" },
    });
    return list.map(toDomain);
  },

  async findByOrderId(orderId: string) {
    const r = await prisma.userPlan.findFirst({ where: { orderId } });
    return r ? toDomain(r) : null;
  },

  async incrementClassesUsed(id: string) {
    const r = await prisma.userPlan.update({
      where: { id },
      data: { classesUsed: { increment: 1 } },
    });
    return toDomain(r);
  },

  async decrementClassesUsed(id: string) {
    const current = await prisma.userPlan.findUniqueOrThrow({ where: { id } });
    const r = await prisma.userPlan.update({
      where: { id },
      data: { classesUsed: Math.max(0, current.classesUsed - 1) },
    });
    return toDomain(r);
  },

  async updateStatus(id: string, status: UserPlanStatus) {
    const r = await prisma.userPlan.update({
      where: { id },
      data: { status: status as unknown as PrismaUserPlanStatus },
    });
    return toDomain(r);
  },
};
