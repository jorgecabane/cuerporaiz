import type { IWebhookEventRepository } from "@/lib/ports";
import { prisma } from "./prisma";

export const webhookEventRepository: IWebhookEventRepository = {
  async wasProcessed(centerId: string, requestId: string) {
    const existing = await prisma.mercadoPagoWebhookEvent.findUnique({
      where: { centerId_requestId: { centerId, requestId } },
    });
    return !!existing;
  },

  async markProcessed(centerId: string, requestId: string) {
    await prisma.mercadoPagoWebhookEvent.create({
      data: { centerId, requestId },
    });
  },
};
