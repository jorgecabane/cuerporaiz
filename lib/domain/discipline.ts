import type { CenterId } from "./user";

export type DisciplineId = string;

export interface Discipline {
  id: DisciplineId;
  centerId: CenterId;
  name: string;
  color: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
