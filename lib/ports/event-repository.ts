import type { Event, EventStatus } from "@/lib/domain/event";

export interface EventCreateInput {
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
}

export interface EventUpdateInput {
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

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  findByCenterId(centerId: string): Promise<Event[]>;
  findByDateRange(centerId: string, start: Date, end: Date): Promise<Event[]>;
  create(centerId: string, data: EventCreateInput): Promise<Event>;
  update(id: string, centerId: string, data: EventUpdateInput): Promise<Event | null>;
  delete(id: string, centerId: string): Promise<boolean>;
}
