import type { CenterId } from "./user";

export interface CenterHoliday {
  id: string;
  centerId: CenterId;
  date: Date;
  label: string | null;
  createdAt: Date;
}
