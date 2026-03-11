/**
 * Ruta de desarrollo para probar envío de emails con Resend.
 * Solo disponible cuando NODE_ENV=development.
 * POST body: { to: string } — envía un email de confirmación de reserva de ejemplo.
 */
import { NextResponse } from "next/server";
import { resendEmailAdapter } from "@/lib/adapters/email";
import { buildReservationConfirmationEmail } from "@/lib/email";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }
  try {
    const body = await request.json();
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    if (!to) {
      return NextResponse.json(
        { error: "Body debe incluir 'to' (email del destinatario)" },
        { status: 400 }
      );
    }
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // mañana
    const endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();
    const dto = buildReservationConfirmationEmail({
      toEmail: to,
      userName: "Alumna de prueba",
      className: "Vinyasa Flow",
      startAt,
      endAt,
      location: "Av. Luis Pasteur 5728, Vitacura",
      myReservationsUrl: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/panel` : undefined,
    });
    const result = await resendEmailAdapter.send(dto);
    if (!result.success) {
      return NextResponse.json(
        { error: "Error al enviar", detail: result.error },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    console.error("[send-test-email]", err);
    return NextResponse.json(
      { error: "Error interno", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
