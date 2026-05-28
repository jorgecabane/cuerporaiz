/**
 * Lógica pura de decisión para Google OAuth sign-in (C5).
 *
 * Antes del fix: cualquier sign-in de Google vinculaba `googleId` al user
 * local cuyo email coincidía, incluso si el local no había verificado su email.
 * Eso permitía takeover: atacante crea cuenta Google con email ajeno, hace
 * sign-in, y queda dueño del user local.
 *
 * Reglas:
 *  1. Si Google no confirmó el email (`email_verified === false` o ausente),
 *     rechazar siempre — no podemos confiar en ese email.
 *  2. Si NO hay user local con ese email: permitir crear uno nuevo
 *     (Google ya confirmó el email).
 *  3. Si HAY user local ya vinculado (`googleId` set): permitir link/login
 *     (este es el flujo normal de "Google login del dueño legítimo").
 *  4. Si HAY user local SIN vincular y SIN emailVerifiedAt: rechazar.
 *     El dueño legítimo todavía no confirmó su correo; auto-link sería
 *     account takeover.
 *  5. Si HAY user local SIN vincular pero CON emailVerifiedAt: permitir
 *     auto-link (el dueño ya demostró control del email vía link de
 *     verificación por credenciales).
 */

export type GoogleSignInDecision = "allow_new_user" | "allow_link" | "reject";

export interface LocalUserSnapshot {
  googleId: string | null;
  emailVerifiedAt: Date | null;
}

export interface GoogleSignInInput {
  googleEmailVerified: boolean;
  localUser: LocalUserSnapshot | null;
}

export function decideGoogleSignIn(input: GoogleSignInInput): GoogleSignInDecision {
  if (!input.googleEmailVerified) return "reject";
  if (!input.localUser) return "allow_new_user";
  if (input.localUser.googleId) return "allow_link";
  if (!input.localUser.emailVerifiedAt) return "reject";
  return "allow_link";
}
