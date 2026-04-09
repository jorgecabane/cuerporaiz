"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { revalidatePath } from "next/cache";
import { eventRepository } from "@/lib/adapters/db";
import type { EventStatus } from "@/lib/domain/event";

async function requireAdminCenterId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");
  return session.user.centerId;
}

export async function createEvent(data: {
  title: string;
  description?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  startsAt: Date;
  endsAt: Date;
  amountCents: number;
  currency?: string;
  maxCapacity?: number | null;
  status?: EventStatus;
  color?: string | null;
}): Promise<void> {
  const centerId = await requireAdminCenterId();
  const event = await eventRepository.create(centerId, data);
  revalidatePath("/panel/eventos");
  redirect(`/panel/eventos/${event.id}`);
}

export async function updateEvent(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    location?: string | null;
    imageUrl?: string | null;
    startsAt?: Date;
    endsAt?: Date;
    amountCents?: number;
    currency?: string;
    maxCapacity?: number | null;
    status?: EventStatus;
    color?: string | null;
  }
): Promise<void> {
  const centerId = await requireAdminCenterId();
  await eventRepository.update(id, centerId, data);
  revalidatePath("/panel/eventos");
  revalidatePath(`/panel/eventos/${id}`);
}

export async function deleteEvent(id: string): Promise<void> {
  const centerId = await requireAdminCenterId();
  await eventRepository.delete(id, centerId);
  revalidatePath("/panel/eventos");
  redirect("/panel/eventos");
}
