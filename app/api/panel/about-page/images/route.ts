import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { aboutPageRepository } from "@/lib/adapters/db";
import { createAboutImageSchema } from "@/lib/dto/about-page-dto";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = createAboutImageSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const page = await aboutPageRepository.findByCenterId(session.user.centerId);
  if (!page) {
    return NextResponse.json(
      { error: "Primero guarda los datos de la página Sobre" },
      { status: 400 },
    );
  }

  const img = await aboutPageRepository.createImage(page.id, parsed.data);
  revalidatePath("/sobre");
  return NextResponse.json(img, { status: 201 });
}
