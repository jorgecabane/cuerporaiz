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

  async findByIdWithItems(id: string) {
    const r = await prisma.centerSiteSection.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    return r ? toSectionWithItems(r) : null;
  },

  async update(id: string, data: UpdateSiteSectionInput) {
    const r = await prisma.centerSiteSection.update({ where: { id }, data });
    return toSection(r);
  },

  async reorder(centerId: string, orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.centerSiteSection.update({ where: { id }, data: { sortOrder: index } })
      )
    );
  },

  async createItem(sectionId: string, data: CreateSiteSectionItemInput) {
    const count = await prisma.centerSiteSectionItem.count({ where: { sectionId } });
    const r = await prisma.centerSiteSectionItem.create({
      data: { sectionId, sortOrder: count, ...data },
    });
    return toSectionItem(r);
  },

  async updateItem(itemId: string, data: UpdateSiteSectionItemInput) {
    const r = await prisma.centerSiteSectionItem.update({ where: { id: itemId }, data });
    return toSectionItem(r);
  },

  async deleteItem(itemId: string) {
    await prisma.centerSiteSectionItem.delete({ where: { id: itemId } });
  },

  async reorderItems(sectionId: string, orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.centerSiteSectionItem.update({ where: { id }, data: { sortOrder: index } })
      )
    );
  },
};
