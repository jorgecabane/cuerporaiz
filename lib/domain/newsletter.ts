/** Newsletter del blog: suscriptores (visitantes) + alumnos del centro. */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface BlogRecipient {
  email: string;
  name?: string;
  /** Alumno del centro: su correo lleva además "Preferencias de correo". */
  isStudent: boolean;
}

/**
 * Une alumnos (que no apagaron "Nuevos artículos del blog") y suscriptores activos,
 * sin duplicar por email. Si un email es ambos, se trata como alumno.
 */
export function mergeBlogRecipients(
  students: { email: string | null; name?: string | null; blogPublished: boolean | null }[],
  activeSubscriberEmails: string[]
): BlogRecipient[] {
  const byEmail = new Map<string, BlogRecipient>();
  for (const s of students) {
    if (!s.email || s.blogPublished === false) continue;
    const email = normalizeEmail(s.email);
    if (!byEmail.has(email)) byEmail.set(email, { email, name: s.name ?? undefined, isStudent: true });
  }
  for (const raw of activeSubscriberEmails) {
    const email = normalizeEmail(raw);
    if (!byEmail.has(email)) byEmail.set(email, { email, isStudent: false });
  }
  return [...byEmail.values()];
}

/** CSV (con BOM para Excel) de suscriptores. Neutraliza fórmulas (=, +, -, @). */
export function toSubscribersCsv(
  rows: { email: string; subscribedAt: Date; unsubscribedAt: Date | null }[]
): string {
  const cell = (value: string) => {
    const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = rows.map((r) =>
    [r.email, r.subscribedAt.toISOString(), r.unsubscribedAt ? "baja" : "suscrito"].map(cell).join(",")
  );
  return `﻿${["email,suscrito_desde,estado", ...lines].join("\n")}\n`;
}
