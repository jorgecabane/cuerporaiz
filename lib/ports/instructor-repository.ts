import type { CenterId } from "@/lib/domain/user";

export interface Instructor {
  id: string;
  userId: string;
  centerId: CenterId;
  name: string | null;
  email: string;
  active: boolean;
  createdAt: Date;
}

export interface CreateInstructorInput {
  name: string;
  email: string;
}

export interface UpdateInstructorInput {
  name?: string;
}

export interface IInstructorRepository {
  findByCenterId(centerId: string): Promise<Instructor[]>;
  findById(id: string, centerId: string): Promise<Instructor | null>;
  create(centerId: string, data: CreateInstructorInput): Promise<Instructor>;
  update(id: string, centerId: string, data: UpdateInstructorInput): Promise<Instructor | null>;
  deactivate(id: string, centerId: string): Promise<boolean>;
}
