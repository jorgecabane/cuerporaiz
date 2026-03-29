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
  update(id: string, data: UpdateCategoryInput): Promise<OnDemandCategory | null>;
  delete(id: string): Promise<boolean>;
  reorder(orderedIds: string[]): Promise<void>;
}
