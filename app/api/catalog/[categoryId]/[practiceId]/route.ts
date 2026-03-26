import { NextResponse } from "next/server";
import {
  onDemandPracticeRepository,
  onDemandLessonRepository,
} from "@/lib/adapters/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string; practiceId: string }> },
) {
  try {
    const { practiceId } = await params;

    const practice = await onDemandPracticeRepository.findById(practiceId);
    if (!practice || practice.status !== "PUBLISHED") {
      return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }

    const publishedLessons = await onDemandLessonRepository.findPublishedByPracticeId(practiceId);

    const lessons = publishedLessons.map(({ videoUrl: _videoUrl, ...lesson }) => ({
      ...lesson,
      hasPromoVideo: lesson.promoVideoUrl !== null,
    }));

    return NextResponse.json({ ...practice, lessons });
  } catch (err) {
    console.error("[catalog practiceId GET]", err);
    return NextResponse.json({ code: "SERVER_ERROR" }, { status: 500 });
  }
}
