import { NextResponse } from "next/server";
import {
  onDemandCategoryRepository,
  onDemandPracticeRepository,
  onDemandLessonRepository,
} from "@/lib/adapters/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get("centerId");

    if (!centerId) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "centerId requerido" }, { status: 400 });
    }

    const categories = await onDemandCategoryRepository.findPublishedByCenterId(centerId);

    const result = await Promise.all(
      categories.map(async (category) => {
        const practices = await onDemandPracticeRepository.findPublishedByCategoryId(category.id);
        const lessonCounts = await Promise.all(
          practices.map((p) => onDemandLessonRepository.findPublishedByPracticeId(p.id).then((l) => l.length)),
        );
        const lessonCount = lessonCounts.reduce((sum, c) => sum + c, 0);

        return {
          ...category,
          practiceCount: practices.length,
          lessonCount,
        };
      }),
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[catalog GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
