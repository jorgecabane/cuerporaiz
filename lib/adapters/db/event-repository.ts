import type { IEventRepository, EventCreateInput, EventUpdateInput } from "@/lib/ports/event-repository";
import type { Event, EventStatus } from "@/lib/domain/event";
import { prisma } from "./prisma";
import type { EventStatus as PrismaEventStatus } from "@prisma/client";

function toDomain(r: {
  id: string;
  centerId: string;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  amountCents: number;
  currency: string;
  maxCapacity: number | null;
  status: PrismaEventStatus;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Event {
  return {
    id: r.id,
    centerId: r.centerId,
    title: r.title,
    description: r.description,
    location: r.location,
    imageUrl: r.imageUrl,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    amountCents: r.amountCents,
    currency: r.currency,
    maxCapacity: r.maxCapacity,
    status: r.status as unknown as EventStatus,
    color: r.color,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const eventRepository: IEventRepository = {
  async findById(id: string) {
    const r = await prisma.event.findUnique({ where: { id } });
    return r ? toDomain(r) : null;
  },

  async findByCenterId(centerId: string) {
    const list = await prisma.event.findMany({
      where: { centerId },
      orderBy: { startsAt: "asc" },
    });
    return list.map(toDomain);
  },

  async findByDateRange(centerId: string, start: Date, end: Date) {
    const list = await prisma.event.findMany({
      where: {
        centerId,
        startsAt: { gte: start },
        endsAt: { lte: end },
      },
      orderBy: { startsAt: "asc" },
    });
    return list.map(toDomain);
  },

  async create(centerId: string, data: EventCreateInput) {
    const r = await prisma.event.create({
      data: {
        centerId,
        title: data.title,
        description: data.description ?? null,
        location: data.location ?? null,
        imageUrl: data.imageUrl ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        amountCents: data.amountCents,
        currency: data.currency ?? "CLP",
        maxCapacity: data.maxCapacity ?? null,
        status: (data.status ?? "PUBLISHED") as PrismaEventStatus,
        color: data.color ?? null,
      },
    });
    return toDomain(r);
  },

  async update(id: string, centerId: string, data: EventUpdateInput) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing || existing.centerId !== centerId) return null;
    const r = await prisma.event.update({
      where: { id },
      data: {
        ...(data.title != null && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.startsAt != null && { startsAt: data.startsAt }),
        ...(data.endsAt != null && { endsAt: data.endsAt }),
        ...(data.amountCents != null && { amountCents: data.amountCents }),
        ...(data.currency != null && { currency: data.currency }),
        ...(data.maxCapacity !== undefined && { maxCapacity: data.maxCapacity }),
        ...(data.status != null && { status: data.status as PrismaEventStatus }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });
    return toDomain(r);
  },

  async delete(id: string, centerId: string) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing || existing.centerId !== centerId) return false;
    await prisma.event.delete({ where: { id } });
    return true;
  },
};
