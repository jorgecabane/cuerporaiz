import type { AboutPage, AboutImage, AboutPageWithImages, AboutImageCategory } from "@/lib/domain/about-page";
import type {
  UpsertAboutPageInput,
  CreateAboutImageInput,
  UpdateAboutImageInput,
} from "@/lib/dto/about-page-dto";

export interface IAboutPageRepository {
  findByCenterId(centerId: string): Promise<AboutPageWithImages | null>;
  upsert(centerId: string, data: UpsertAboutPageInput): Promise<AboutPage>;

  listImages(pageId: string): Promise<AboutImage[]>;
  createImage(pageId: string, data: CreateAboutImageInput): Promise<AboutImage>;
  /** Devuelve null si la imagen no existe o no pertenece al centro. */
  updateImage(imageId: string, centerId: string, data: UpdateAboutImageInput): Promise<AboutImage | null>;
  /** Devuelve false si la imagen no existe o no pertenece al centro. */
  deleteImage(imageId: string, centerId: string): Promise<boolean>;
  reorderImages(
    pageId: string,
    category: AboutImageCategory,
    orderedIds: string[],
  ): Promise<void>;
}
