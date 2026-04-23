import type { IAboutPageRepository } from "@/lib/ports/about-page-repository";
import type {
  AboutPage,
  AboutImage,
  AboutPageWithImages,
  AboutImageCategory,
} from "@/lib/domain/about-page";
import { prisma } from "./prisma";

type PrismaAboutPageRow = {
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
};

type PrismaAboutImageRow = {
  id: string;
  pageId: string;
  imageUrl: string;
  caption: string | null;
  category: AboutImageCategory;
  sortOrder: number;
  visible: boolean;
};

function toAboutPage(r: PrismaAboutPageRow): AboutPage {
  return {
    id: r.id,
    centerId: r.centerId,
    visible: r.visible,
    showInHeader: r.showInHeader,
    headerLabel: r.headerLabel,
    pageTitle: r.pageTitle,
    pageEyebrow: r.pageEyebrow,
    name: r.name,
    tagline: r.tagline,
    heroImageUrl: r.heroImageUrl,
    bio: r.bio,
    propuesta: r.propuesta,
    ctaLabel: r.ctaLabel,
    ctaHref: r.ctaHref,
  };
}

function toAboutImage(r: PrismaAboutImageRow): AboutImage {
  return {
    id: r.id,
    pageId: r.pageId,
    imageUrl: r.imageUrl,
    caption: r.caption,
    category: r.category,
    sortOrder: r.sortOrder,
    visible: r.visible,
  };
}

export const aboutPageRepository: IAboutPageRepository = {
  async findByCenterId(centerId) {
    const row = await prisma.centerAboutPage.findUnique({
      where: { centerId },
      include: { images: { orderBy: [{ category: "asc" }, { sortOrder: "asc" }] } },
    });
    if (!row) return null;
    return { ...toAboutPage(row), images: row.images.map(toAboutImage) } satisfies AboutPageWithImages;
  },

  async upsert(centerId, data) {
    const row = await prisma.centerAboutPage.upsert({
      where: { centerId },
      create: { centerId, ...data },
      update: data,
    });
    return toAboutPage(row);
  },

  async listImages(pageId) {
    const rows = await prisma.centerAboutPageImage.findMany({
      where: { pageId },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    return rows.map(toAboutImage);
  },

  async createImage(pageId, data) {
    const count = await prisma.centerAboutPageImage.count({
      where: { pageId, category: data.category },
    });
    const row = await prisma.centerAboutPageImage.create({
      data: {
        pageId,
        imageUrl: data.imageUrl,
        caption: data.caption ?? null,
        category: data.category,
        visible: data.visible ?? true,
        sortOrder: count,
      },
    });
    return toAboutImage(row);
  },

  async updateImage(imageId, data) {
    const row = await prisma.centerAboutPageImage.update({
      where: { id: imageId },
      data,
    });
    return toAboutImage(row);
  },

  async deleteImage(imageId) {
    await prisma.centerAboutPageImage.delete({ where: { id: imageId } });
  },

  async reorderImages(pageId, category, orderedIds) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.centerAboutPageImage.updateMany({
          where: { id, pageId, category },
          data: { sortOrder: index },
        }),
      ),
    );
  },
};
