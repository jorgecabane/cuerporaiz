import { NextResponse } from "next/server";
import { centerRepository } from "@/lib/adapters/db";

export async function GET() {
  try {
    const centers = await centerRepository.findAll();
    return NextResponse.json(centers);
  } catch (err) {
    console.error("[centers]", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Error al listar centros" },
      { status: 500 }
    );
  }
}
