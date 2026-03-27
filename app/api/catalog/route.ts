import { NextResponse } from "next/server";
import { onDemandCategoryRepository } from "@/lib/adapters/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get("centerId");

    if (!centerId) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "centerId requerido" }, { status: 400 });
    }

    const categoriesTree = await onDemandCategoryRepository.findPublishedTreeByCenterId(centerId);
    const result = categoriesTree.map((cat) => ({
      ...cat,
      practiceCount: cat.practices.length,
      lessonCount: cat.practices.reduce((acc, p) => acc + p.lessons.length, 0),
      practices: undefined,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[catalog GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
