import { NextResponse } from "next/server";

/**
 * Back URL de MercadoPago: suscripción rechazada o fallida.
 */
export async function GET(request: Request) {
  const base =
    request.headers.get("origin") ??
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000";
  return NextResponse.redirect(`${base}/panel?membresia=failure`);
}
