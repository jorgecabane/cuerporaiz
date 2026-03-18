import { prisma } from "./prisma";
import type {
  IManualPaymentRepository,
  ManualPaymentPageResult,
} from "@/lib/ports/manual-payment-repository";

export const manualPaymentRepository: IManualPaymentRepository = {
  async findPageByCenterId(centerId, filters) {
    const take = Math.max(1, Math.min(100, filters.take));
    const page = Math.max(1, Math.floor(filters.page));
    const skip = (page - 1) * take;

    const list = await prisma.manualPayment.findMany({
      where: {
        centerId,
        ...(filters.userId != null && { userId: filters.userId }),
        ...(filters.from || filters.to
          ? {
              paidAt: {
                ...(filters.from && { gte: filters.from }),
                ...(filters.to && { lte: filters.to }),
              },
            }
          : {}),
        ...(filters.email != null && filters.email !== ""
          ? {
              user: {
                email: { contains: filters.email, mode: "insensitive" },
              },
            }
          : {}),
      },
      include: {
        userPlan: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
      skip,
      take: take + 1,
    });

    const hasMore = list.length > take;
    const items = list.slice(0, take).map((p) => ({
      id: p.id,
      centerId: p.centerId,
      userId: p.userId,
      userPlanId: p.userPlanId,
      planName: p.userPlan?.plan?.name ?? null,
      amountCents: p.amountCents,
      currency: p.currency,
      method: p.method,
      note: p.note,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));

    const result: ManualPaymentPageResult = { items, hasMore };
    return result;
  },
};

