import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "cuerporaiz.session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith("/auth/");
  const isPanel = pathname.startsWith("/panel");
  const hasSessionCookie = req.cookies.has(SESSION_COOKIE_NAME);

  if (isAuthPage && hasSessionCookie) {
    return NextResponse.redirect(new URL("/panel", req.url));
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
