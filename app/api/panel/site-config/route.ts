import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { revalidatePath } from "next/cache";
import { siteConfigRepository } from "@/lib/adapters/db";
import { upsertSiteConfigSchema } from "@/lib/dto/site-config-dto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const centerId = session.user.centerId;

  const config = await siteConfigRepository.findByCenterId(centerId);
  return NextResponse.json(config ?? { centerId, heroTitle: null, heroSubtitle: null, heroImageUrl: null, logoUrl: null, faviconUrl: null, colorPrimary: null, colorSecondary: null, colorAccent: null, contactEmail: null, contactPhone: null, contactAddress: null, instagramUrl: null, facebookUrl: null, whatsappUrl: null, youtubeUrl: null, blogEnabled: false, blogLabel: "Blog", heroOverlayEnabled: true });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const centerId = session.user.centerId;

  const raw = await request.json();
  const parsed = upsertSiteConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const config = await siteConfigRepository.upsert(centerId, parsed.data);
  revalidatePath("/");
  return NextResponse.json(config);
}
