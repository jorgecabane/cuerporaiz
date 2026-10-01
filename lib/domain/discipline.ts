import type { CenterId } from "./user";

export type DisciplineId = string;

export interface Discipline {
  id: DisciplineId;
  centerId: CenterId;
  name: string;
  /** Texto corto que se muestra junto a cada clase de esta práctica. */
  description: string | null;
  color: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
