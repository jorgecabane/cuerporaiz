import type { IOrderRepository, Order, CreateOrderInput, OrderStatus } from "@/lib/ports";
import type { OrderListFilters } from "@/lib/ports/order-repository";
import { prisma } from "./prisma";
import type { OrderStatus as PrismaOrderStatus } from "@prisma/client";

function toDomain(o: {
  id: string;
  centerId: string;
  userId: string;
  planId: string;
  amountCents: number;
  currency: string;
  status: PrismaOrderStatus;
  externalReference: string;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Order {
  return {
    id: o.id,
    centerId: o.centerId,
    userId: o.userId,
    planId: o.planId,
    amountCents: o.amountCents,
    currency: o.currency,
    status: o.status as unknown as OrderStatus,
    externalReference: o.externalReference,
    mpPreferenceId: o.mpPreferenceId,
    mpPaymentId: o.mpPaymentId,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export const orderRepository: IOrderRepository = {
  async create(data: CreateOrderInput) {
    const o = await prisma.order.create({
      data: {
        centerId: data.centerId,
        userId: data.userId,
        planId: data.planId,
        amountCents: data.amountCents,
        currency: data.currency,
        externalReference: data.externalReference,
        mpPreferenceId: data.mpPreferenceId ?? null,
      },
    });
    return toDomain(o);
  },

  async findById(id: string) {
    const o = await prisma.order.findUnique({ where: { id } });
    return o ? toDomain(o) : null;
  },

  async findByExternalReference(externalReference: string) {
    const o = await prisma.order.findUnique({
      where: { externalReference },
    });
    return o ? toDomain(o) : null;
  },

  async findByMpPaymentId(mpPaymentId: string) {
    const o = await prisma.order.findFirst({
      where: { mpPaymentId },
    });
    return o ? toDomain(o) : null;
  },

  async updateStatus(id: string, status: OrderStatus, mpPaymentId?: string | null) {
    const o = await prisma.order.update({
      where: { id },
      data: {
        status: status as unknown as PrismaOrderStatus,
        ...(mpPaymentId !== undefined && { mpPaymentId }),
      },
    });
    return toDomain(o);
  },

  async findManyByCenterId(centerId: string, filters?: OrderListFilters) {
    const list = await prisma.order.findMany({
      where: {
        centerId,
        ...(filters?.status != null && { status: filters.status as unknown as PrismaOrderStatus }),
      },
      orderBy: { createdAt: "desc" },
    });
    return list.map(toDomain);
  },

  async findManyByUserIdAndCenterId(userId: string, centerId: string) {
    const list = await prisma.order.findMany({
      where: { userId, centerId },
      orderBy: { createdAt: "desc" },
    });
    return list.map(toDomain);
  },
};
