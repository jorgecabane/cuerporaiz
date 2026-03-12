/**
 * Rol de usuario en un centro (tenant).
 * Valores alineados con el enum de Prisma (inglés). Usar constantes/funciones; no literales.
 */
export type Role = "ADMINISTRATOR" | "INSTRUCTOR" | "STUDENT";

export const ROLES: Role[] = ["ADMINISTRATOR", "INSTRUCTOR", "STUDENT"];

/** Rol que puede acceder al panel de administración. */
export const ADMIN_ROLE: Role = "ADMINISTRATOR";

/** Etiquetas para UI. Tipado para no olvidar ningún rol. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMINISTRATOR: "Administradora",
  INSTRUCTOR: "Profesora",
  STUDENT: "Alumna",
};

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export function isAdminRole(role: Role): boolean {
  return role === ADMIN_ROLE;
}
