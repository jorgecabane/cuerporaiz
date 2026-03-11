import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listLiveClassesUseCase } from "@/lib/application/reserve-class";
import { centerRepository } from "@/lib/adapters/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const center = await centerRepository.findBySlug(slug);
    if (!center) {
      return NextResponse.json(
        { code: "CENTER_NOT_FOUND", message: "Centro no encontrado" },
        { status: 404 }
      );
    }
    const classes = await listLiveClassesUseCase(center.id);
    return NextResponse.json(classes);
  } catch (err) {
    console.error("[live-classes]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar clases" },
      { status: 500 }
    );
  }
}
