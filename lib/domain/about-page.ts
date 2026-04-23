export const ABOUT_IMAGE_CATEGORIES = ["RETIROS", "CLASES", "ESPACIO"] as const;
export type AboutImageCategory = (typeof ABOUT_IMAGE_CATEGORIES)[number];

export const ABOUT_IMAGE_CATEGORY_LABELS: Record<AboutImageCategory, string> = {
  RETIROS: "Retiros",
  CLASES: "Clases",
  ESPACIO: "La sala",
};

export interface AboutPage {
  id: string;
  centerId: string;
  visible: boolean;
  showInHeader: boolean;
  headerLabel: string;
  pageTitle: string;
  pageEyebrow: string | null;
  name: string | null;
  tagline: string | null;
  heroImageUrl: string | null;
  bio: string | null;
  propuesta: string | null;
  ctaLabel: string;
  ctaHref: string;
}

export interface AboutImage {
  id: string;
  pageId: string;
  imageUrl: string;
  caption: string | null;
  category: AboutImageCategory;
  sortOrder: number;
  visible: boolean;
}

export interface AboutPageWithImages extends AboutPage {
  images: AboutImage[];
}

export function groupImagesByCategory(
  images: AboutImage[],
): Record<AboutImageCategory, AboutImage[]> {
  const grouped: Record<AboutImageCategory, AboutImage[]> = {
    RETIROS: [],
    CLASES: [],
    ESPACIO: [],
  };
  for (const img of images) {
    if (img.visible) grouped[img.category].push(img);
  }
  for (const key of ABOUT_IMAGE_CATEGORIES) {
    grouped[key].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return grouped;
}
