import type { IPlanRepository, Plan, PlanCreateInput, PlanUpdateInput } from "@/lib/ports";
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

  async create(centerId: string, data: PlanCreateInput) {
    const p = await prisma.plan.create({
      data: {
        centerId,
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        amountCents: data.amountCents,
        currency: data.currency ?? "CLP",
        type: data.type as PrismaPlanType,
      },
    });
    return toDomain(p);
  },

  async update(id: string, centerId: string, data: PlanUpdateInput) {
    const p = await prisma.plan.findFirst({ where: { id, centerId } });
    if (!p) return null;
    const updated = await prisma.plan.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.slug != null && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amountCents != null && { amountCents: data.amountCents }),
        ...(data.currency != null && { currency: data.currency }),
        ...(data.type != null && { type: data.type as PrismaPlanType }),
      },
    });
    return toDomain(updated);
  },

  async delete(id: string, centerId: string) {
    const p = await prisma.plan.findFirst({ where: { id, centerId } });
    if (!p) return false;
    await prisma.plan.delete({ where: { id } });
    return true;
  },
};
