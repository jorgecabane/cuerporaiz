import type { SiteSection, SiteSectionWithItems, SiteSectionItem } from "@/lib/domain/site-config";
import type { UpdateSiteSectionInput, CreateSiteSectionItemInput, UpdateSiteSectionItemInput } from "@/lib/dto/site-config-dto";

/**
 * Repo de configuración de sitio. Todas las mutaciones requieren `centerId`
 * para garantizar aislamiento multi-tenant a nivel SQL: un update/delete que
 * apunta a un recurso de otro centro es no-op (devuelve null/false), no error.
 */
export interface ISiteSectionRepository {
  findByCenterId(centerId: string): Promise<SiteSectionWithItems[]>;
  findByIdWithItems(id: string, centerId: string): Promise<SiteSectionWithItems | null>;
  update(id: string, centerId: string, data: UpdateSiteSectionInput): Promise<SiteSection | null>;
  reorder(centerId: string, orderedIds: string[]): Promise<void>;
  createItem(sectionId: string, centerId: string, data: CreateSiteSectionItemInput): Promise<SiteSectionItem | null>;
  updateItem(itemId: string, centerId: string, data: UpdateSiteSectionItemInput): Promise<SiteSectionItem | null>;
  deleteItem(itemId: string, centerId: string): Promise<boolean>;
  reorderItems(sectionId: string, centerId: string, orderedIds: string[]): Promise<boolean>;
}
