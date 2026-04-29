import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/domain/role";
import { getSanityWriteClient } from "@/lib/sanity/client";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Máximo 4MB" }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa JPEG, PNG, WebP o AVIF." },
      { status: 415 },
    );
  }

  try {
    const client = getSanityWriteClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await client.assets.upload("image", buffer, {
      filename: file.name || "upload",
      contentType: file.type,
    });
    return NextResponse.json({ url: asset.url, assetId: asset._id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al subir a Sanity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
