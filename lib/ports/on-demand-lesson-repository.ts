import type {
  OnDemandLesson,
  CreateLessonInput,
  UpdateLessonInput,
} from "@/lib/domain/on-demand";

export interface IOnDemandLessonRepository {
  findByPracticeId(practiceId: string): Promise<OnDemandLesson[]>;
  findPublishedByPracticeId(practiceId: string): Promise<OnDemandLesson[]>;
  findById(id: string): Promise<OnDemandLesson | null>;
  /** Crea sólo si la practice → category pertenece al centro. */
  create(centerId: string, data: CreateLessonInput): Promise<OnDemandLesson | null>;
  /** Devuelve null si la lección no existe o no pertenece (vía practice→category) al centro. */
  update(id: string, centerId: string, data: UpdateLessonInput): Promise<OnDemandLesson | null>;
  /** Devuelve false si la lección no existe o no pertenece al centro. */
  delete(id: string, centerId: string): Promise<boolean>;
  /** Sólo afecta lecciones cuyas practice→category pertenezcan al centro. */
  reorder(centerId: string, orderedIds: string[]): Promise<void>;
}
