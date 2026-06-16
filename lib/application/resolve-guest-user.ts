/**
 * Caso de uso: resolver el usuario para una compra guest (sin login).
 *
 * Reglas:
 * - Email de cuenta registrada (con contraseña o email verificado) → NEEDS_LOGIN.
 *   No creamos ticket; el front invita a iniciar sesión.
 * - Email de un guest previo (passwordless) → reusamos ese usuario y completamos
 *   nombre/teléfono si faltaban.
 * - Email nuevo → creamos un usuario passwordless (passwordHash "", sin verificar)
 *   con rol STUDENT en el centro. Es el mismo patrón que usa el alta vía Google.
 *
 * Más tarde el guest puede "reclamar" la cuenta seteando contraseña (ver
 * claim-guest-account).
 */
import { userRepository } from "@/lib/adapters/db";
import type { Role } from "@/lib/domain/role";

const GUEST_ROLE: Role = "STUDENT";

export type ResolveGuestUserResult =
  | { ok: true; userId: string }
  | { ok: false; code: "NEEDS_LOGIN"; message: string };

export interface ResolveGuestUserInput {
  centerId: string;
  email: string;
  name: string;
  phone: string;
}

export async function resolveGuestUser(
  input: ResolveGuestUserInput
): Promise<ResolveGuestUserResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const phone = input.phone.trim();

  const existing = await userRepository.findAuthSummaryByEmail(email);

  if (existing) {
    if (existing.hasPassword || existing.emailVerified) {
      return {
        ok: false,
        code: "NEEDS_LOGIN",
        message: "Ya tienes una cuenta con este correo. Inicia sesión para continuar.",
      };
    }
    // Guest previo: reusar y completar contacto sin pisar lo que ya tenga.
    await userRepository.updateGuestProfile(existing.id, {
      name: existing.name ? undefined : name,
      phone: existing.phone ? undefined : phone,
    });
    await ensureMembership(existing.id, input.centerId);
    return { ok: true, userId: existing.id };
  }

  const user = await userRepository.create({
    email,
    passwordHash: "",
    name,
    phone,
  });
  await userRepository.addRole(user.id, input.centerId, GUEST_ROLE);
  return { ok: true, userId: user.id };
}

async function ensureMembership(userId: string, centerId: string): Promise<void> {
  const membership = await userRepository.findMembership(userId, centerId);
  if (!membership) {
    await userRepository.addRole(userId, centerId, GUEST_ROLE);
  }
}
