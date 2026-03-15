import type { Center } from "@/lib/domain";

export interface CenterPoliciesUpdate {
  cancelBeforeHours?: number;
  maxNoShowsPerMonth?: number;
  bookBeforeHours?: number;
  notifyWhenSlotFreed?: boolean;
  instructorCanReserveForStudent?: boolean;
  allowTrialClassPerPerson?: boolean;
  calendarStartHour?: number;
  calendarEndHour?: number;
  calendarWeekStartDay?: number;
  defaultClassDurationMinutes?: number;
}

export interface ICenterRepository {
  findById(id: string): Promise<Center | null>;
  findBySlug(slug: string): Promise<Center | null>;
  create(data: { name: string; slug: string }): Promise<Center>;
  findAll(): Promise<Center[]>;
  updatePolicies(centerId: string, data: CenterPoliciesUpdate): Promise<Center | null>;
}
