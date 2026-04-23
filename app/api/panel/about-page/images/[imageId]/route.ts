import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { aboutPageRepository } from "@/lib/adapters/db";
import { updateAboutImageSchema } from "@/lib/dto/about-page-dto";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { imageId } = await params;
  const raw = await request.json();
  const parsed = updateAboutImageSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await aboutPageRepository.updateImage(imageId, parsed.data);
  revalidatePath("/sobre");
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { imageId } = await params;
  await aboutPageRepository.deleteImage(imageId);
  revalidatePath("/sobre");
  return new NextResponse(null, { status: 204 });
}
