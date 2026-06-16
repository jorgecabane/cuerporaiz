import { NextResponse } from "next/server";
import { z } from "zod";
import { eventTicketRepository, userRepository } from "@/lib/adapters/db";
import { authService } from "@/lib/adapters/auth/auth-service";
import { claimGuestAccount } from "@/lib/application/claim-guest-account";

const bodySchema = z.object({
  ticketId: z.string().min(1),
  token: z.string().min(1),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200),
});

const statusByCode: Record<string, number> = {
  WEAK_PASSWORD: 400,
  INVALID_TOKEN: 404,
  ALREADY_REGISTERED: 409,
};

/**
 * POST /api/events/claim-account — reclama una cuenta guest seteando contraseña.
 * Body: `{ ticketId, token, password }`. El token es el `claimToken` del ticket.
 */
export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const { ticketId, token, password } = parsed.data;

    const result = await claimGuestAccount(
      { ticketId, token, password },
      {
        findTicketByClaimToken: async (t) => {
          const ticket = await eventTicketRepository.findByClaimToken(t);
          return ticket ? { id: ticket.id, userId: ticket.userId } : null;
        },
        findUserAuthById: async (userId) => {
          const summary = await userRepository.findAuthSummaryById(userId);
          return summary
            ? { hasPassword: summary.hasPassword, emailVerified: summary.emailVerified }
            : null;
        },
        setPasswordAndVerify: (userId, hash) => userRepository.setPasswordAndVerify(userId, hash),
        hashPassword: (p) => authService.hashPassword(p),
      }
    );

    if (!result.success) {
      const messages: Record<string, string> = {
        WEAK_PASSWORD: "La contraseña debe tener al menos 8 caracteres.",
        INVALID_TOKEN: "El enlace no es válido.",
        ALREADY_REGISTERED: "Esta cuenta ya tiene contraseña. Inicia sesión.",
      };
      return NextResponse.json(
        { code: result.code, message: messages[result.code] },
        { status: statusByCode[result.code] ?? 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[events claim-account POST]", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "No pudimos crear tu cuenta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
