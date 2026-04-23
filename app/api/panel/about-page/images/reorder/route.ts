import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { aboutPageRepository } from "@/lib/adapters/db";
import { reorderAboutImagesSchema } from "@/lib/dto/about-page-dto";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = reorderAboutImagesSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const page = await aboutPageRepository.findByCenterId(session.user.centerId);
  if (!page) {
    return NextResponse.json({ error: "Página no encontrada" }, { status: 404 });
  }

  await aboutPageRepository.reorderImages(page.id, parsed.data.category, parsed.data.orderedIds);
  revalidatePath("/sobre");
  return new NextResponse(null, { status: 204 });
}
