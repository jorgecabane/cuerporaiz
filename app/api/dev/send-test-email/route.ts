/**
 * Dev route to test email sending with Resend.
 * Only available when NODE_ENV=development.
 * POST body: { to: string } — sends a sample reservation confirmation email.
 */
import { NextResponse } from "next/server";
import { resendEmailAdapter } from "@/lib/adapters/email";
import { buildReservationConfirmationEmail } from "@/lib/email";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const body = await request.json();
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    if (!to) {
      return NextResponse.json(
        { error: "Body must include 'to' (recipient email)" },
        { status: 400 }
      );
    }
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // tomorrow
    const endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();
    const dto = buildReservationConfirmationEmail({
      toEmail: to,
      userName: "Test student",
      className: "Vinyasa Flow",
      startAt,
      endAt,
      location: "Av. Luis Pasteur 5728, Vitacura",
      myReservationsUrl: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/panel` : undefined,
    });
    const result = await resendEmailAdapter.send(dto);
    if (!result.success) {
      return NextResponse.json(
        { error: "Send failed", detail: result.error },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    console.error("[send-test-email]", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
