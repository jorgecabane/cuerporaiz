import type { IPlanRepository, Plan, PlanCreateInput, PlanUpdateInput } from "@/lib/ports";
import type { PlanType, BillingMode, ValidityPeriod } from "@/lib/ports/plan-repository";
import { prisma } from "./prisma";
import { PlanType as PrismaPlanType, BillingMode as PrismaBillingMode, ValidityPeriod as PrismaValidityPeriod } from "@/lib/generated/prisma";

function toDomain(p: {
  id: string;
  centerId: string;
  name: string;
  slug: string;
  description: string | null;
  amountCents: number;
  currency: string;
  type: PrismaPlanType;
  validityDays: number | null;
  validityPeriod: PrismaValidityPeriod | null;
  billingMode: PrismaBillingMode | null;
  maxReservations: number | null;
  maxReservationsPerDay: number | null;
  maxReservationsPerWeek: number | null;
}): Plan {
  return {
    id: p.id,
    centerId: p.centerId,
    name: p.name,
    slug: p.slug,
    description: p.description,
    amountCents: p.amountCents,
    currency: p.currency,
    type: (p.type === "PACK" ? "LIVE" : p.type === "MEMBERSHIP" ? "MEMBERSHIP_ON_DEMAND" : p.type) as PlanType,
    validityDays: p.validityDays,
    validityPeriod: p.validityPeriod as unknown as ValidityPeriod | null,
    billingMode: p.billingMode as unknown as BillingMode | null,
    maxReservations: p.maxReservations,
    maxReservationsPerDay: p.maxReservationsPerDay,
    maxReservationsPerWeek: p.maxReservationsPerWeek,
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
        validityDays: data.validityDays ?? null,
        validityPeriod: (data.validityPeriod ?? null) as PrismaValidityPeriod | null,
        billingMode: (data.billingMode ?? null) as PrismaBillingMode | null,
        maxReservations: data.maxReservations ?? null,
        maxReservationsPerDay: data.maxReservationsPerDay ?? null,
        maxReservationsPerWeek: data.maxReservationsPerWeek ?? null,
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
        ...(data.validityDays !== undefined && { validityDays: data.validityDays }),
        ...(data.validityPeriod !== undefined && { validityPeriod: data.validityPeriod as PrismaValidityPeriod | null }),
        ...(data.billingMode !== undefined && { billingMode: data.billingMode as PrismaBillingMode | null }),
        ...(data.maxReservations !== undefined && { maxReservations: data.maxReservations }),
        ...(data.maxReservationsPerDay !== undefined && { maxReservationsPerDay: data.maxReservationsPerDay }),
        ...(data.maxReservationsPerWeek !== undefined && { maxReservationsPerWeek: data.maxReservationsPerWeek }),
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
