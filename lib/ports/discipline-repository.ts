import type { Discipline } from "@/lib/domain";

export interface CreateDisciplineInput {
  name: string;
  color?: string | null;
  active?: boolean;
}

export interface UpdateDisciplineInput {
  name?: string;
  color?: string | null;
  active?: boolean;
}

export interface IDisciplineRepository {
  findById(id: string): Promise<Discipline | null>;
  findManyByCenterId(centerId: string): Promise<Discipline[]>;
  findActiveByCenterId(centerId: string): Promise<Discipline[]>;
  create(centerId: string, data: CreateDisciplineInput): Promise<Discipline>;
  update(id: string, centerId: string, data: UpdateDisciplineInput): Promise<Discipline | null>;
  delete(id: string, centerId: string): Promise<boolean>;
}
