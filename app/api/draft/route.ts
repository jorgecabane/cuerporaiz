import { NextResponse, type NextRequest } from "next/server";
import { draftMode } from "next/headers";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { isSanityConfigured } from "@/sanity/env";

/**
 * Enable Next.js draft mode for blog post preview.
 *
 * Requires either:
 * - Authenticated admin session (preview desde el Studio)
 * - ?secret=<SANITY_PREVIEW_SECRET> matching env secret (integración con webhook/preview URL)
 */
export async function GET(req: NextRequest) {
  if (!isSanityConfigured()) {
    return NextResponse.json({ error: "Sanity no configurado" }, { status: 404 });
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const slug = url.searchParams.get("slug");

  const session = await auth();
  const isAdmin = session?.user && isAdminRole(session.user.role);

  const secretMatches =
    typeof secret === "string" &&
    process.env.SANITY_PREVIEW_SECRET &&
    secret === process.env.SANITY_PREVIEW_SECRET;

  if (!isAdmin && !secretMatches) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  const redirectUrl = slug ? `/blog/${encodeURIComponent(slug)}` : "/blog";
  return NextResponse.redirect(new URL(redirectUrl, req.url));
}
