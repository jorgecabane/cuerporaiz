import { prisma } from "./prisma";
import type {
  ISubscriptionRepository,
  CreateSubscriptionInput,
} from "@/lib/ports/subscription-repository";
import type { Subscription, SubscriptionStatus } from "@/lib/domain/subscription";
import type { SubscriptionStatus as PrismaSubscriptionStatus } from "@prisma/client";

function toDomain(row: {
  id: string;
  centerId: string;
  userId: string;
  planId: string;
  mpSubscriptionId: string;
  mpPayerId: string | null;
  status: PrismaSubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}): Subscription {
  return {
    id: row.id,
    centerId: row.centerId,
    userId: row.userId,
    planId: row.planId,
    mpSubscriptionId: row.mpSubscriptionId,
    mpPayerId: row.mpPayerId,
    status: row.status as SubscriptionStatus,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const subscriptionRepository: ISubscriptionRepository = {
  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    const row = await prisma.subscription.create({
      data: {
        centerId: input.centerId,
        userId: input.userId,
        planId: input.planId,
        mpSubscriptionId: input.mpSubscriptionId,
        mpPayerId: input.mpPayerId ?? null,
        status: (input.status ?? "ACTIVE") as PrismaSubscriptionStatus,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
      },
    });
    return toDomain(row);
  },

  async findById(id: string): Promise<Subscription | null> {
    const row = await prisma.subscription.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  },

  async findByMpSubscriptionId(mpSubscriptionId: string): Promise<Subscription | null> {
    const row = await prisma.subscription.findUnique({ where: { mpSubscriptionId } });
    return row ? toDomain(row) : null;
  },

  async findActiveByUserAndCenter(
    userId: string,
    centerId: string
  ): Promise<Subscription[]> {
    const rows = await prisma.subscription.findMany({
      where: { userId, centerId, status: "ACTIVE" as PrismaSubscriptionStatus },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  },

  async updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription> {
    const row = await prisma.subscription.update({
      where: { id },
      data: { status: status as PrismaSubscriptionStatus },
    });
    return toDomain(row);
  },

  async updatePeriod(
    id: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Subscription> {
    const row = await prisma.subscription.update({
      where: { id },
      data: { currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
    });
    return toDomain(row);
  },
};
