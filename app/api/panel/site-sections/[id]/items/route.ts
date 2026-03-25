import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { revalidatePath } from "next/cache";
import { siteSectionRepository } from "@/lib/adapters/db";
import { createSiteSectionItemSchema } from "@/lib/dto/site-config-dto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const raw = await request.json();
  const parsed = createSiteSectionItemSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const item = await siteSectionRepository.createItem(id, parsed.data);
  revalidatePath("/");
  return NextResponse.json(item, { status: 201 });
}
