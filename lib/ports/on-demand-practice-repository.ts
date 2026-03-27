import type {
  OnDemandPractice,
  CreatePracticeInput,
  UpdatePracticeInput,
} from "@/lib/domain/on-demand";

export interface IOnDemandPracticeRepository {
  findByCategoryId(categoryId: string): Promise<OnDemandPractice[]>;
  findPublishedByCategoryId(categoryId: string): Promise<OnDemandPractice[]>;
  findById(id: string): Promise<OnDemandPractice | null>;
  create(data: CreatePracticeInput): Promise<OnDemandPractice>;
  update(id: string, data: UpdatePracticeInput): Promise<OnDemandPractice | null>;
  delete(id: string): Promise<boolean>;
  reorder(orderedIds: string[]): Promise<void>;
}
