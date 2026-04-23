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
  updateImage(imageId: string, data: UpdateAboutImageInput): Promise<AboutImage>;
  deleteImage(imageId: string): Promise<void>;
  reorderImages(
    pageId: string,
    category: AboutImageCategory,
    orderedIds: string[],
  ): Promise<void>;
}
