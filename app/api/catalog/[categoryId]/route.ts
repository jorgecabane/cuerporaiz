import { NextResponse } from "next/server";
import {
  onDemandCategoryRepository,
  onDemandPracticeRepository,
  onDemandLessonRepository,
} from "@/lib/adapters/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const { categoryId } = await params;

    const category = await onDemandCategoryRepository.findById(categoryId);
    if (!category || category.status !== "PUBLISHED") {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }

    const practices = await onDemandPracticeRepository.findPublishedByCategoryId(categoryId);

    const practicesWithCount = await Promise.all(
      practices.map(async (practice) => {
        const lessons = await onDemandLessonRepository.findPublishedByPracticeId(practice.id);
        return { ...practice, lessonCount: lessons.length };
      }),
    );

    return NextResponse.json({ ...category, practices: practicesWithCount });
  } catch (err) {
    console.error("[catalog categoryId GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
