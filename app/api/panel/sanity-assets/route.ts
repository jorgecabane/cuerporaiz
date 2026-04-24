import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { sanityFetch } from "@/lib/sanity/client";
import { isSanityConfigured } from "@/sanity/env";

type AssetRow = {
  _id: string;
  url: string;
  originalFilename: string | null;
  metadata: { dimensions: { width: number; height: number } | null } | null;
};

const QUERY_ASSETS = `
  *[_type == "sanity.imageAsset" && (!defined(source) || source.name != "user-profile")]
    | order(_createdAt desc)[0...60] {
      _id,
      url,
      originalFilename,
      metadata { dimensions { width, height } }
    }
`;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isSanityConfigured()) {
    return NextResponse.json({ error: "Sanity no configurado" }, { status: 503 });
  }

  const assets = (await sanityFetch<AssetRow[]>(QUERY_ASSETS, {}, { revalidate: 30 })) ?? [];
  return NextResponse.json({ assets });
}
