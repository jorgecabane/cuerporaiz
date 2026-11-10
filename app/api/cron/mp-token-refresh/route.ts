import { NextResponse } from "next/server";
import { refreshExpiringMpTokens } from "@/lib/application/mp-token-refresh";
import { isCronAuthorized } from "@/lib/utils/cron-auth";

/** Renueva los tokens de MercadoPago que vencen dentro de 30 días. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshExpiringMpTokens(new Date());
  return NextResponse.json({ ok: true, ...result });
}
