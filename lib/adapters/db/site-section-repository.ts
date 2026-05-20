import type { ISiteSectionRepository } from "@/lib/ports/site-section-repository";
import type { SiteSection, SiteSectionWithItems, SiteSectionItem } from "@/lib/domain/site-config";
import type { UpdateSiteSectionInput, CreateSiteSectionItemInput, UpdateSiteSectionItemInput } from "@/lib/dto/site-config-dto";
import { prisma } from "./prisma";

function toSectionItem(r: {
  id: string;
  sectionId: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  href: string | null;
  userId: string | null;
  sortOrder: number;
}): SiteSectionItem {
  return {
    id: r.id,
    sectionId: r.sectionId,
    title: r.title,
    description: r.description,
    imageUrl: r.imageUrl,
    linkUrl: r.linkUrl,
    href: r.href,
    userId: r.userId,
    sortOrder: r.sortOrder,
  };
}

function toSection(r: {
  id: string;
  centerId: string;
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  visible: boolean;
  sortOrder: number;
}): SiteSection {
  return {
    id: r.id,
    centerId: r.centerId,
    sectionKey: r.sectionKey as SiteSection["sectionKey"],
    title: r.title,
    subtitle: r.subtitle,
    visible: r.visible,
    sortOrder: r.sortOrder,
  };
}

function toSectionWithItems(r: {
  id: string;
  centerId: string;
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  visible: boolean;
  sortOrder: number;
  items: {
    id: string;
    sectionId: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    href: string | null;
    userId: string | null;
    sortOrder: number;
  }[];
}): SiteSectionWithItems {
  return { ...toSection(r), items: r.items.map(toSectionItem) };
}

export const siteSectionRepository: ISiteSectionRepository = {
  async findByCenterId(centerId: string) {
    const rows = await prisma.centerSiteSection.findMany({
      where: { centerId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toSectionWithItems);
  },

  async findByIdWithItems(id: string, centerId: string) {
    const r = await prisma.centerSiteSection.findFirst({
      where: { id, centerId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    return r ? toSectionWithItems(r) : null;
  },

  async update(id: string, centerId: string, data: UpdateSiteSectionInput) {
    const result = await prisma.centerSiteSection.updateMany({
      where: { id, centerId },
      data,
    });
    if (result.count === 0) return null;
    const r = await prisma.centerSiteSection.findUnique({ where: { id } });
    return r ? toSection(r) : null;
  },

  async reorder(centerId: string, orderedIds: string[]) {
    // Sólo afecta secciones que efectivamente pertenecen al centro.
    // IDs ajenos quedan ignorados (no-op por filtro compuesto en updateMany).
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.centerSiteSection.updateMany({
          where: { id, centerId },
          data: { sortOrder: index },
        })
      )
    );
  },

  async createItem(sectionId: string, centerId: string, data: CreateSiteSectionItemInput) {
    // Verifica que la sección pertenezca al centro antes de crear ítem.
    const section = await prisma.centerSiteSection.findFirst({
      where: { id: sectionId, centerId },
      select: { id: true },
    });
    if (!section) return null;

    const count = await prisma.centerSiteSectionItem.count({ where: { sectionId } });
    const r = await prisma.centerSiteSectionItem.create({
      data: { sectionId, sortOrder: count, ...data },
    });
    return toSectionItem(r);
  },

  async updateItem(itemId: string, centerId: string, data: UpdateSiteSectionItemInput) {
    const result = await prisma.centerSiteSectionItem.updateMany({
      where: { id: itemId, section: { centerId } },
      data,
    });
    if (result.count === 0) return null;
    const r = await prisma.centerSiteSectionItem.findUnique({ where: { id: itemId } });
    return r ? toSectionItem(r) : null;
  },

  async deleteItem(itemId: string, centerId: string) {
    const result = await prisma.centerSiteSectionItem.deleteMany({
      where: { id: itemId, section: { centerId } },
    });
    return result.count > 0;
  },

  async reorderItems(sectionId: string, centerId: string, orderedIds: string[]) {
    // Verifica que la sección pertenezca al centro antes de reordenar ítems.
    const section = await prisma.centerSiteSection.findFirst({
      where: { id: sectionId, centerId },
      select: { id: true },
    });
    if (!section) return false;

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.centerSiteSectionItem.updateMany({
          where: { id, sectionId },
          data: { sortOrder: index },
        })
      )
    );
    return true;
  },
};
