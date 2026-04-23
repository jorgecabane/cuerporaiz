import { NextResponse, type NextRequest } from "next/server";
import { draftMode } from "next/headers";

export async function GET(req: NextRequest) {
  const draft = await draftMode();
  draft.disable();
  return NextResponse.redirect(new URL("/blog", req.url));
}
