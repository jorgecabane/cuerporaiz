import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSanityWriteClient } from "@/lib/sanity/client";
import { resizeImage } from "@/lib/sanity/resize";
import { memoryRateLimit } from "@/lib/application/memory-rate-limit";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIMENSION = 800;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rl = memoryRateLimit(`upload:${session.user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en un momento." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds ?? 60) } },
    );
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
    return NextResponse.json({ error: "Máximo 2MB" }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa JPEG, PNG o WebP." },
      { status: 415 },
    );
  }

  try {
    const resized = await resizeImage(await file.arrayBuffer(), MAX_DIMENSION);
    const client = getSanityWriteClient();
    const asset = await client.assets.upload("image", resized.buffer, {
      filename: `profile-${session.user.id}.webp`,
      contentType: "image/webp",
      source: {
        id: session.user.id,
        name: "user-profile",
        url: "/panel/mi-perfil",
      },
    });
    return NextResponse.json({ url: asset.url, assetId: asset._id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al subir a Sanity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
