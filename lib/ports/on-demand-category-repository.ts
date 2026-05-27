import type {
  OnDemandCategory,
  OnDemandPractice,
  OnDemandLesson,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/domain/on-demand";

export type CategoryTree = OnDemandCategory & {
  practices: (OnDemandPractice & { lessons: OnDemandLesson[] })[];
};

export interface IOnDemandCategoryRepository {
  findByCenterId(centerId: string): Promise<OnDemandCategory[]>;
  findPublishedByCenterId(centerId: string): Promise<OnDemandCategory[]>;
  findPublishedTreeByCenterId(centerId: string): Promise<CategoryTree[]>;
  findById(id: string): Promise<OnDemandCategory | null>;
  create(data: CreateCategoryInput): Promise<OnDemandCategory>;
  /** Devuelve null si la categoría no existe o no pertenece al centro. */
  update(id: string, centerId: string, data: UpdateCategoryInput): Promise<OnDemandCategory | null>;
  /** Devuelve false si la categoría no existe o no pertenece al centro. */
  delete(id: string, centerId: string): Promise<boolean>;
  /** Sólo afecta categorías del centro indicado; IDs ajenos quedan ignorados. */
  reorder(centerId: string, orderedIds: string[]): Promise<void>;
}
