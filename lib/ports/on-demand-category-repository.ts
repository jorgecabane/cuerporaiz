import type {
  OnDemandCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/domain/on-demand";

export interface IOnDemandCategoryRepository {
  findByCenterId(centerId: string): Promise<OnDemandCategory[]>;
  findPublishedByCenterId(centerId: string): Promise<OnDemandCategory[]>;
  findById(id: string): Promise<OnDemandCategory | null>;
  create(data: CreateCategoryInput): Promise<OnDemandCategory>;
  update(id: string, data: UpdateCategoryInput): Promise<OnDemandCategory | null>;
  delete(id: string): Promise<boolean>;
  reorder(orderedIds: string[]): Promise<void>;
}
