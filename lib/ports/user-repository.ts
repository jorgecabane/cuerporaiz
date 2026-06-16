import type { User, UserWithMemberships } from "@/lib/domain";
import type { CenterId } from "@/lib/domain/user";
import type { Role } from "@/lib/domain/role";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name?: string | null;
  phone?: string | null;
}

/**
 * Resumen mínimo de autenticación de un usuario, usado para distinguir entre
 * una cuenta registrada (tiene contraseña o email verificado) y un usuario
 * "guest" passwordless creado en una compra sin login.
 */
export interface UserAuthSummary {
  id: string;
  name: string | null;
  phone: string | null;
  hasPassword: boolean;
  emailVerified: boolean;
}

export interface UserWithCenterRole extends User {
  role: Role;
}

export interface UserMembership {
  role: Role;
  isLegacyClient: boolean;
}

export interface IUserRepository {
  create(data: CreateUserInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  /** Resumen de auth por email para resolver compras guest. Null si no existe. */
  findAuthSummaryByEmail(email: string): Promise<UserAuthSummary | null>;
  /** Resumen de auth por id (usado al reclamar una cuenta guest). */
  findAuthSummaryById(userId: string): Promise<UserAuthSummary | null>;
  /** Completa nombre/teléfono de un usuario guest sin pisar valores existentes. */
  updateGuestProfile(
    userId: string,
    data: { name?: string; phone?: string }
  ): Promise<void>;
  /** Setea contraseña + marca email verificado (reclamo de cuenta guest). */
  setPasswordAndVerify(userId: string, passwordHash: string): Promise<void>;
  findById(id: string): Promise<User | null>;
  findManyByIds(ids: string[]): Promise<User[]>;
  findByIdWithMemberships(id: string): Promise<UserWithMemberships | null>;
  findManyByCenterId(centerId: CenterId): Promise<UserWithCenterRole[]>;
  findMembership(userId: string, centerId: CenterId): Promise<UserMembership | null>;
  addRole(userId: string, centerId: CenterId, role: Role): Promise<void>;
  setLegacyClient(userId: string, centerId: CenterId, isLegacyClient: boolean): Promise<void>;
}
