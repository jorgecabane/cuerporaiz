import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
    const safeCallback =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/panel";
    return NextResponse.redirect(new URL(safeCallback, req.url));
  }
  if (isPanel && !hasSessionCookie) {
    const login = new URL("/auth/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*", "/auth/:path*"],
};
