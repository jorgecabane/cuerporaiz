import {
  centerRepository,
  aboutPageRepository,
  siteConfigRepository,
  siteSectionRepository,
} from "@/lib/adapters/db";
import { DEFAULT_NAV } from "@/lib/constants/copy";
import { buildPublicNav, type NavItem } from "@/lib/domain/public-nav";
import { toFaqItems } from "@/lib/domain/site-config";
import { isSanityConfigured } from "@/sanity/env";

/**
 * Menú público del centro (ver `buildPublicNav`): "Nosotros" (Sobre, FAQ),
 * "Practica" (Horarios, Biblioteca, Eventos), Blog y Contacto, según lo que
 * esté habilitado. Server-only. Nunca lanza: ante error cae a DEFAULT_NAV.
 */
export async function getPublicNavLinks(): Promise<NavItem[]> {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return DEFAULT_NAV;

  try {
    const center = await centerRepository.findBySlug(slug);
    if (!center) return DEFAULT_NAV;

    const [aboutPage, siteConfig, sections] = await Promise.all([
      aboutPageRepository.findByCenterId(center.id),
      siteConfigRepository.findByCenterId(center.id),
      siteSectionRepository.findByCenterId(center.id),
    ]);
    const faq = sections.find((s) => s.sectionKey === "faq");

    return buildPublicNav({
      aboutLabel: aboutPage?.visible && aboutPage.showInHeader ? aboutPage.headerLabel : null,
      faqEnabled: Boolean(faq?.visible && toFaqItems(faq.items).length > 0),
      blogLabel: siteConfig?.blogEnabled && isSanityConfigured() ? siteConfig.blogLabel : null,
      labels: {
        inPerson: siteConfig?.headerNavLabelInPerson,
        online: siteConfig?.headerNavLabelOnline,
        contact: siteConfig?.headerNavLabelContact,
      },
    });
  } catch {
    return DEFAULT_NAV;
  }
}
