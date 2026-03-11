import type { IPlanRepository, Plan } from "@/lib/ports";
import type { PlanType } from "@/lib/ports/plan-repository";
import { prisma } from "./prisma";
import { PlanType as PrismaPlanType } from "@/lib/generated/prisma";

function toDomain(p: {
  id: string;
  centerId: string;
  name: string;
  slug: string;
  description: string | null;
  amountCents: number;
  currency: string;
  type: PrismaPlanType;
}): Plan {
  return {
    id: p.id,
    centerId: p.centerId,
    name: p.name,
    slug: p.slug,
    description: p.description,
    amountCents: p.amountCents,
    currency: p.currency,
    type: p.type as unknown as PlanType,
  };
}

export const planRepository: IPlanRepository = {
  async findById(id: string) {
    const p = await prisma.plan.findUnique({ where: { id } });
    return p ? toDomain(p) : null;
  },

  async findByCenterAndSlug(centerId: string, slug: string) {
    const p = await prisma.plan.findUnique({
      where: { centerId_slug: { centerId, slug } },
    });
    return p ? toDomain(p) : null;
  },

  async findManyByCenterId(centerId: string) {
    const list = await prisma.plan.findMany({
      where: { centerId },
      orderBy: { name: "asc" },
    });
    return list.map(toDomain);
  },
};
