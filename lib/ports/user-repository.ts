import type { User, UserWithMemberships } from "@/lib/domain";
import type { CenterId } from "@/lib/domain/user";
import type { Role } from "@/lib/domain/role";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name?: string | null;
}

export interface IUserRepository {
  create(data: CreateUserInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByIdWithMemberships(id: string): Promise<UserWithMemberships | null>;
  addRole(userId: string, centerId: CenterId, role: Role): Promise<void>;
}
