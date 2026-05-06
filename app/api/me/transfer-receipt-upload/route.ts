import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSanityWriteClient } from "@/lib/sanity/client";
import { resizeImage } from "@/lib/sanity/resize";
import { memoryRateLimit } from "@/lib/application/memory-rate-limit";
import { prisma } from "@/lib/adapters/db/prisma";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIMENSION = 1600;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * POST /api/me/transfer-receipt-upload
 *
 * Body (multipart/form-data):
 *   - file:  imagen (JPEG/PNG/WebP) o PDF, max 4MB
 *   - orderId?: id del Order (planes)
 *   - eventTicketId?: id del EventTicket (eventos)
 *
 * Sube el archivo a Sanity y crea un documento `paymentReceipt` que linkea
 * al order/ticket. Retorna `{ receiptDocId, assetUrl, mimeType }`.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.centerId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rl = memoryRateLimit(`transfer-receipt:${session.user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
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
    return NextResponse.json({ error: "Máximo 4MB" }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa JPEG, PNG, WebP o PDF." },
      { status: 415 },
    );
  }

  const orderIdRaw = form.get("orderId");
  const eventTicketIdRaw = form.get("eventTicketId");
  const orderId = typeof orderIdRaw === "string" && orderIdRaw.trim() ? orderIdRaw.trim() : null;
  const eventTicketId =
    typeof eventTicketIdRaw === "string" && eventTicketIdRaw.trim() ? eventTicketIdRaw.trim() : null;

  if (!orderId && !eventTicketId) {
    return NextResponse.json({ error: "Falta orderId o eventTicketId" }, { status: 400 });
  }
  if (orderId && eventTicketId) {
    return NextResponse.json({ error: "Solo uno de orderId o eventTicketId" }, { status: 400 });
  }

  // Verificar que el Order/EventTicket existe y pertenece al usuario.
  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, centerId: true, status: true },
    });
    if (!order || order.userId !== session.user.id || order.centerId !== session.user.centerId) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Esta orden ya no admite comprobantes" }, { status: 409 });
    }
  } else if (eventTicketId) {
    const ticket = await prisma.eventTicket.findUnique({
      where: { id: eventTicketId },
      include: { event: { select: { centerId: true } } },
    });
    if (!ticket || ticket.userId !== session.user.id || ticket.event.centerId !== session.user.centerId) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }
    if (ticket.status !== "PENDING") {
      return NextResponse.json({ error: "Este ticket ya no admite comprobantes" }, { status: 409 });
    }
  }

  try {
    const client = getSanityWriteClient();
    const arrayBuffer = await file.arrayBuffer();

    let assetBuffer: Buffer;
    let assetContentType: string;
    let assetFilename: string;

    if (IMAGE_MIME.has(file.type)) {
      // Defensa en profundidad: re-comprimimos en server aunque el cliente ya optimizó.
      const resized = await resizeImage(arrayBuffer, MAX_DIMENSION);
      assetBuffer = resized.buffer;
      assetContentType = "image/webp";
      assetFilename = `transfer-receipt-${session.user.id}-${Date.now()}.webp`;
    } else {
      assetBuffer = Buffer.from(arrayBuffer);
      assetContentType = "application/pdf";
      assetFilename = `transfer-receipt-${session.user.id}-${Date.now()}.pdf`;
    }

    const asset = await client.assets.upload(
      IMAGE_MIME.has(file.type) ? "image" : "file",
      assetBuffer,
      { filename: assetFilename, contentType: assetContentType },
    );

    const doc = await client.create({
      _type: "paymentReceipt",
      centerId: session.user.centerId,
      orderId: orderId ?? undefined,
      eventTicketId: eventTicketId ?? undefined,
      uploadedBy: session.user.id,
      uploadedAt: new Date().toISOString(),
      asset: {
        _type: IMAGE_MIME.has(file.type) ? "image" : "file",
        asset: { _type: "reference", _ref: asset._id },
      },
    });

    return NextResponse.json({
      receiptDocId: doc._id,
      assetUrl: asset.url,
      mimeType: assetContentType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al subir comprobante";
    console.error("transfer-receipt-upload failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
