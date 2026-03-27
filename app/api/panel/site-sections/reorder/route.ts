import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { revalidatePath } from "next/cache";
import { siteSectionRepository } from "@/lib/adapters/db";
import { reorderSchema } from "@/lib/dto/site-config-dto";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const centerId = session.user.centerId;

  const raw = await request.json();
  const parsed = reorderSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  await siteSectionRepository.reorder(centerId, parsed.data.orderedIds);
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
