import type { IUserPlanRepository, CreateUserPlanInput } from "@/lib/ports/user-plan-repository";
import type { UserPlan, UserPlanStatus, PlanPaymentStatus } from "@/lib/domain/user-plan";
import { prisma } from "./prisma";
import type {
  UserPlanStatus as PrismaUserPlanStatus,
  PlanPaymentStatus as PrismaPlanPaymentStatus,
} from "@prisma/client";

function toDomain(r: {
  id: string;
  userId: string;
  planId: string;
  centerId: string;
  orderId: string | null;
  subscriptionId: string | null;
  status: PrismaUserPlanStatus;
  paymentStatus: PrismaPlanPaymentStatus;
  classesTotal: number | null;
  classesUsed: number;
  validFrom: Date;
  validUntil: Date | null;
  frozenAt: Date | null;
  frozenUntil: Date | null;
  freezeReason: string | null;
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
    subscriptionId: r.subscriptionId,
    status: r.status as unknown as UserPlanStatus,
    paymentStatus: r.paymentStatus as unknown as PlanPaymentStatus,
    classesTotal: r.classesTotal,
    classesUsed: r.classesUsed,
    validFrom: r.validFrom,
    validUntil: r.validUntil,
    frozenAt: r.frozenAt,
    frozenUntil: r.frozenUntil,
    freezeReason: r.freezeReason,
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
        subscriptionId: data.subscriptionId ?? null,
        paymentStatus: (data.paymentStatus ?? "PENDING") as PrismaPlanPaymentStatus,
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
      where: { userId, centerId, status: "ACTIVE" },
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

  async updatePaymentStatus(id: string, paymentStatus: PlanPaymentStatus) {
    const r = await prisma.userPlan.update({
      where: { id },
      data: { paymentStatus: paymentStatus as unknown as PrismaPlanPaymentStatus },
    });
    return toDomain(r);
  },

  async freeze(id: string, reason: string, frozenUntil: Date | null) {
    const r = await prisma.userPlan.update({
      where: { id },
      data: {
        status: "FROZEN" as unknown as PrismaUserPlanStatus,
        frozenAt: new Date(),
        frozenUntil,
        freezeReason: reason,
      },
    });
    return toDomain(r);
  },

  async unfreeze(id: string) {
    const r = await prisma.userPlan.update({
      where: { id },
      data: {
        status: "ACTIVE" as unknown as PrismaUserPlanStatus,
        unfrozenAt: new Date(),
        frozenUntil: null,
        freezeReason: null,
      },
    });
    return toDomain(r);
  },
};
