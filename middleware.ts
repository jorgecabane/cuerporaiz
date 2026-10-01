import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeCallbackUrl } from "@/lib/domain/auth-redirect";

const SESSION_COOKIE_NAME = "cuerporaiz.session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith("/auth/");
  const isPanel = pathname.startsWith("/panel");
  const hasSessionCookie = req.cookies.has(SESSION_COOKIE_NAME);

  if (isAuthPage && hasSessionCookie) {
    // Si el usuario ya está logueado y entra a /auth/*, respetamos el ?callbackUrl=
    // (o ?next=) para preservar el contexto de la página de la que vino.
    const callbackUrl =
      req.nextUrl.searchParams.get("callbackUrl") ??
      req.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(safeCallbackUrl(callbackUrl), req.url));
  }
  if (isPanel && !hasSessionCookie) {
    const login = new URL("/auth/login", req.url);
    // Incluye la query (ej. /panel/tienda?plan=…) para no perder el contexto.
    login.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/auth/:path*"],
};
