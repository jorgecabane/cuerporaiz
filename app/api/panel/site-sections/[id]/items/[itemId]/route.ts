import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { revalidatePath } from "next/cache";
import { siteSectionRepository } from "@/lib/adapters/db";
import { updateSiteSectionItemSchema } from "@/lib/dto/site-config-dto";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { itemId } = await params;
  const raw = await request.json();
  const parsed = updateSiteSectionItemSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const item = await siteSectionRepository.updateItem(itemId, session.user.centerId, parsed.data);
  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }
  revalidatePath("/");
  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { itemId } = await params;
  const ok = await siteSectionRepository.deleteItem(itemId, session.user.centerId);
  if (!ok) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }
  revalidatePath("/");
  return new NextResponse(null, { status: 204 });
}
