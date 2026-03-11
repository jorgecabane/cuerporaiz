/**
 * Rol de usuario en un centro (tenant).
 * Valores alineados con el enum de Prisma para el adaptador.
 */
export type Role = "ADMINISTRADORA" | "PROFESORA" | "ALUMNA";

export const ROLES: Role[] = ["ADMINISTRADORA", "PROFESORA", "ALUMNA"];

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}
