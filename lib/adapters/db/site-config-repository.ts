import type { ISiteConfigRepository } from "@/lib/ports/site-config-repository";
import type { SiteConfig } from "@/lib/domain/site-config";
import type { UpsertSiteConfigInput } from "@/lib/dto/site-config-dto";
import { prisma } from "./prisma";

function toDomain(r: {
  id: string;
  centerId: string;
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  colorAccent: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  youtubeUrl: string | null;
  blogEnabled: boolean;
  blogLabel: string;
}): SiteConfig {
  return {
    id: r.id,
    centerId: r.centerId,
    heroEyebrow: r.heroEyebrow,
    heroTitle: r.heroTitle,
    heroSubtitle: r.heroSubtitle,
    heroImageUrl: r.heroImageUrl,
    logoUrl: r.logoUrl,
    colorPrimary: r.colorPrimary,
    colorSecondary: r.colorSecondary,
    colorAccent: r.colorAccent,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    contactAddress: r.contactAddress,
    instagramUrl: r.instagramUrl,
    facebookUrl: r.facebookUrl,
    whatsappUrl: r.whatsappUrl,
    youtubeUrl: r.youtubeUrl,
    blogEnabled: r.blogEnabled,
    blogLabel: r.blogLabel,
  };
}

export const siteConfigRepository: ISiteConfigRepository = {
  async findByCenterId(centerId: string) {
    const r = await prisma.centerSiteConfig.findUnique({ where: { centerId } });
    return r ? toDomain(r) : null;
  },

  async upsert(centerId: string, data: UpsertSiteConfigInput) {
    const r = await prisma.centerSiteConfig.upsert({
      where: { centerId },
      create: { centerId, ...data },
      update: data,
    });
    return toDomain(r);
  },
};
