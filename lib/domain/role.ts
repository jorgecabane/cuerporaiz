/**
 * User role within a center (tenant).
 * Values must match Prisma Role enum. All identifiers in English.
 */
export const ROLES = ["ADMINISTRATOR", "INSTRUCTOR", "STUDENT"] as const;

export type Role = (typeof ROLES)[number];

/** Role that can access admin panel (plugins, plans, clients, payments). */
export const ADMIN_ROLE: Role = "ADMINISTRATOR";

/** Labels for UI. Use i18n in the future if needed. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMINISTRATOR: "Administrator",
  INSTRUCTOR: "Instructor",
  STUDENT: "Student",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isAdminRole(role: Role): boolean {
  return role === ADMIN_ROLE;
}

/** Role assigned by default on signup. */
export const DEFAULT_SIGNUP_ROLE: Role = "STUDENT";
