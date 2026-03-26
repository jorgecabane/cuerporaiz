import type {
  OnDemandLesson,
  CreateLessonInput,
  UpdateLessonInput,
} from "@/lib/domain/on-demand";

export interface IOnDemandLessonRepository {
  findByPracticeId(practiceId: string): Promise<OnDemandLesson[]>;
  findPublishedByPracticeId(practiceId: string): Promise<OnDemandLesson[]>;
  findById(id: string): Promise<OnDemandLesson | null>;
  create(data: CreateLessonInput): Promise<OnDemandLesson>;
  update(id: string, data: UpdateLessonInput): Promise<OnDemandLesson | null>;
  delete(id: string): Promise<boolean>;
  reorder(orderedIds: string[]): Promise<void>;
}
