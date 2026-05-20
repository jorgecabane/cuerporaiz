import type {
  OnDemandPractice,
  OnDemandLesson,
  CreatePracticeInput,
  UpdatePracticeInput,
} from "@/lib/domain/on-demand";

export type PracticeWithLessons = OnDemandPractice & { lessons: OnDemandLesson[] };

export interface IOnDemandPracticeRepository {
  findByCategoryId(categoryId: string): Promise<OnDemandPractice[]>;
  findPublishedByCategoryId(categoryId: string): Promise<OnDemandPractice[]>;
  findPublishedWithLessonsByCategoryId(categoryId: string): Promise<PracticeWithLessons[]>;
  findById(id: string): Promise<OnDemandPractice | null>;
  /** Crea sólo si la categoría pertenece al centro. */
  create(centerId: string, data: CreatePracticeInput): Promise<OnDemandPractice | null>;
  /** Devuelve null si la practice no existe o no pertenece (vía category) al centro. */
  update(id: string, centerId: string, data: UpdatePracticeInput): Promise<OnDemandPractice | null>;
  /** Devuelve false si la practice no existe o no pertenece al centro. */
  delete(id: string, centerId: string): Promise<boolean>;
  /** Sólo afecta practices cuyas categorías pertenezcan al centro. */
  reorder(centerId: string, orderedIds: string[]): Promise<void>;
}
