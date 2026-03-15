import type { CenterHoliday } from "@/lib/domain/center-holiday";

export interface CreateHolidayInput {
  date: Date;
  label?: string | null;
}

export interface ICenterHolidayRepository {
  findByCenterId(centerId: string): Promise<CenterHoliday[]>;
  findByCenterIdAndDate(centerId: string, date: Date): Promise<CenterHoliday | null>;
  create(centerId: string, data: CreateHolidayInput): Promise<CenterHoliday>;
  delete(id: string, centerId: string): Promise<boolean>;
}
