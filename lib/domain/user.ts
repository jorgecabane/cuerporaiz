/**
 * Entidad de dominio: usuario.
 * Sin referencias a Prisma ni a infraestructura.
 */
import type { Role } from "./role";

export type UserId = string;
export type CenterId = string;

export interface User {
  id: UserId;
  email: string;
  name: string | null;
  lastName: string | null;
  phone: string | null;
  rut: string | null;
  birthday: Date | null;
  sex: string | null;
  imageUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithMemberships extends User {
  memberships: Array<{ centerId: CenterId; role: Role }>;
}
