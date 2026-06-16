/**
 * Caso de uso: reclamar una cuenta guest tras la compra.
 *
 * El comprador llega a la confirmación con un `claimToken` (en la URL, también
 * enviado por correo). Setea una contraseña → el usuario passwordless pasa a ser
 * una cuenta normal con email verificado, y puede iniciar sesión.
 *
 * Sólo aplica a usuarios passwordless sin email verificado; si ya tiene
 * contraseña o está verificado, debe iniciar sesión / recuperar contraseña.
 */
export interface ClaimGuestAccountDeps {
  findTicketByClaimToken: (token: string) => Promise<{ id: string; userId: string } | null>;
  findUserAuthById: (userId: string) => Promise<{ hasPassword: boolean; emailVerified: boolean } | null>;
  setPasswordAndVerify: (userId: string, passwordHash: string) => Promise<void>;
  hashPassword: (password: string) => Promise<string>;
}

export type ClaimGuestAccountResult =
  | { success: true }
  | { success: false; code: "INVALID_TOKEN" | "ALREADY_REGISTERED" | "WEAK_PASSWORD" };

export async function claimGuestAccount(
  input: { ticketId: string; token: string; password: string },
  deps: ClaimGuestAccountDeps
): Promise<ClaimGuestAccountResult> {
  if (input.password.length < 8) {
    return { success: false, code: "WEAK_PASSWORD" };
  }

  const ticket = await deps.findTicketByClaimToken(input.token);
  if (!ticket || ticket.id !== input.ticketId) {
    return { success: false, code: "INVALID_TOKEN" };
  }

  const auth = await deps.findUserAuthById(ticket.userId);
  if (!auth) {
    return { success: false, code: "INVALID_TOKEN" };
  }
  if (auth.hasPassword || auth.emailVerified) {
    return { success: false, code: "ALREADY_REGISTERED" };
  }

  const hash = await deps.hashPassword(input.password);
  await deps.setPasswordAndVerify(ticket.userId, hash);
  return { success: true };
}
