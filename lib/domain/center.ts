/**
 * Entidad de dominio: centro (tenant).
 * Sin referencias a Prisma ni a infraestructura.
 */
import type { CenterId } from "./user";

export interface Center {
  id: CenterId;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}
