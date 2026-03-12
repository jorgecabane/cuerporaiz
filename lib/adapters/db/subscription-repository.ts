import type {
  ISubscriptionRepository,
  Subscription,
  SubscriptionStatus,
  CreateSubscriptionInput,
} from "@/lib/ports/subscription-repository";
import { prisma } from "./prisma";
import type { PrismaClient } from "@/lib/generated/prisma";

const db = prisma as unknown as PrismaClient;

function toDomain(s: {
  id: string;
  centerId: string;
  userId: string;
  planId: string;
  status: string;
  mpPreapprovalId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  pausedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Subscription {
  return {
    id: s.id,
    centerId: s.centerId,
    userId: s.userId,
    planId: s.planId,
    status: s.status as SubscriptionStatus,
    mpPreapprovalId: s.mpPreapprovalId,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    pausedUntil: s.pausedUntil,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export const subscriptionRepository: ISubscriptionRepository = {
  async create(data: CreateSubscriptionInput) {
    const s = await db.subscription.create({
      data: {
        centerId: data.centerId,
        userId: data.userId,
        planId: data.planId,
        mpPreapprovalId: data.mpPreapprovalId ?? null,
      },
    });
    return toDomain(s);
  },

  async findById(id: string) {
    const s = await db.subscription.findUnique({ where: { id } });
    return s ? toDomain(s) : null;
  },

  async findActiveByUserAndCenter(userId: string, centerId: string) {
    const s = await db.subscription.findFirst({
      where: {
        userId,
        centerId,
        status: { in: ["ACTIVE", "PAUSED"] },
      },
      orderBy: { createdAt: "desc" },
    });
    return s ? toDomain(s) : null;
  },

  async findByMpPreapprovalId(preapprovalId: string) {
    const s = await db.subscription.findFirst({
      where: { mpPreapprovalId: preapprovalId },
    });
    return s ? toDomain(s) : null;
  },

  async updateStatus(
    id: string,
    status: SubscriptionStatus,
    period?: { start: Date; end: Date },
    pausedUntil?: Date | null
  ) {
    const updated = await db.subscription.update({
      where: { id },
      data: {
        status,
        ...(period && {
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
        }),
        ...(pausedUntil !== undefined && { pausedUntil }),
      },
    });
    return toDomain(updated);
  },

  async updateMpPreapprovalId(id: string, mpPreapprovalId: string) {
    const updated = await db.subscription.update({
      where: { id },
      data: { mpPreapprovalId },
    });
    return toDomain(updated);
  },
};
