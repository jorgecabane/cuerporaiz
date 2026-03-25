import type { SiteSection, SiteSectionWithItems, SiteSectionItem } from "@/lib/domain/site-config";
import type { UpdateSiteSectionInput, CreateSiteSectionItemInput, UpdateSiteSectionItemInput } from "@/lib/dto/site-config-dto";

export interface ISiteSectionRepository {
  findByCenterId(centerId: string): Promise<SiteSectionWithItems[]>;
  findByIdWithItems(id: string): Promise<SiteSectionWithItems | null>;
  update(id: string, data: UpdateSiteSectionInput): Promise<SiteSection>;
  reorder(centerId: string, orderedIds: string[]): Promise<void>;
  createItem(sectionId: string, data: CreateSiteSectionItemInput): Promise<SiteSectionItem>;
  updateItem(itemId: string, data: UpdateSiteSectionItemInput): Promise<SiteSectionItem>;
  deleteItem(itemId: string): Promise<void>;
  reorderItems(sectionId: string, orderedIds: string[]): Promise<void>;
}
