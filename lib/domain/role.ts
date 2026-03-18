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
  ADMINISTRATOR: "Administración",
  INSTRUCTOR: "Profesores",
  STUDENT: "Estudiantes",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isAdminRole(role: Role): boolean {
  return role === ADMIN_ROLE;
}

export function isStudentRole(role: Role): boolean {
  return role === "STUDENT";
}

export function isInstructorRole(role: Role): boolean {
  return role === "INSTRUCTOR";
}

/** Staff = administración o profesor. */
export function isStaffRole(role: Role): boolean {
  return role === "ADMINISTRATOR" || role === "INSTRUCTOR";
}

/** Rol por defecto en signup. */
export const DEFAULT_SIGNUP_ROLE: Role = "STUDENT";
