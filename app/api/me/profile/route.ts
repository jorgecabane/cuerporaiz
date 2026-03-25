import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/adapters/db/prisma";
import { updateProfileSchema } from "@/lib/dto/profile-dto";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      if (key === "birthday" && typeof value === "string") {
        data[key] = new Date(value);
      } else {
        data[key] = value;
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, lastName: true, phone: true, rut: true, birthday: true, sex: true, imageUrl: true },
  });

  return NextResponse.json(updated);
}
