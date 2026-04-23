import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { aboutPageRepository } from "@/lib/adapters/db";
import { upsertAboutPageSchema } from "@/lib/dto/about-page-dto";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = upsertAboutPageSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const page = await aboutPageRepository.upsert(session.user.centerId, parsed.data);
  revalidatePath("/sobre");
  revalidatePath("/");
  return NextResponse.json(page);
}
