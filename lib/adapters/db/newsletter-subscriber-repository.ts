import type { INewsletterSubscriberRepository } from "@/lib/ports/newsletter-subscriber-repository";
import { prisma } from "./prisma";

export const newsletterSubscriberRepository: INewsletterSubscriberRepository = {
  async subscribe(centerId, email) {
    await prisma.newsletterSubscriber.upsert({
      where: { centerId_email: { centerId, email } },
      create: { centerId, email },
      update: { unsubscribedAt: null, subscribedAt: new Date() },
    });
  },

  async unsubscribe(centerId, email) {
    await prisma.newsletterSubscriber.updateMany({
      where: { centerId, email, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
  },

  async listByCenter(centerId) {
    return prisma.newsletterSubscriber.findMany({
      where: { centerId },
      orderBy: { subscribedAt: "desc" },
    });
  },

  async listActiveEmails(centerId) {
    const rows = await prisma.newsletterSubscriber.findMany({
      where: { centerId, unsubscribedAt: null },
      select: { email: true },
    });
    return rows.map((r) => r.email);
  },
};
