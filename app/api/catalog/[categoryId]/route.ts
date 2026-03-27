import { NextResponse } from "next/server";
import { onDemandCategoryRepository, onDemandPracticeRepository } from "@/lib/adapters/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const { categoryId } = await params;

    const [category, practicesWithLessons] = await Promise.all([
      onDemandCategoryRepository.findById(categoryId),
      onDemandPracticeRepository.findPublishedWithLessonsByCategoryId(categoryId),
    ]);

    if (!category || category.status !== "PUBLISHED") {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }

    const practices = practicesWithLessons.map((p) => ({ ...p, lessonCount: p.lessons.length, lessons: undefined }));

    return NextResponse.json({ ...category, practices });
  } catch (err) {
    console.error("[catalog categoryId GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
