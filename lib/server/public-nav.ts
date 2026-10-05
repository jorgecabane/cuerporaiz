import { aboutPageRepository, siteSectionRepository } from "@/lib/adapters/db";
import { getSiteContext } from "@/lib/seo/metadata";
import { DEFAULT_NAV } from "@/lib/constants/copy";
import { buildPublicNav, type NavItem } from "@/lib/domain/public-nav";
import { toFaqItems } from "@/lib/domain/site-config";
import { isSanityConfigured } from "@/sanity/env";

/**
 * Menú público del centro (ver `buildPublicNav`): grupo "about" (Sobre, Conócenos, FAQ),
 * "Practica" (Horarios, Biblioteca, Eventos), Blog y Contacto, según lo que
 * esté habilitado. Server-only. Nunca lanza: ante error cae a DEFAULT_NAV.
 */
export async function getPublicNavLinks(): Promise<NavItem[]> {
  try {
    const ctx = await getSiteContext();
    if (!ctx) return DEFAULT_NAV;
    const { center, siteConfig } = ctx;

    const [aboutPage, sections] = await Promise.all([
      aboutPageRepository.findByCenterId(center.id),
      siteSectionRepository.findByCenterId(center.id),
    ]);
    const faq = sections.find((s) => s.sectionKey === "faq");

    return buildPublicNav({
      aboutLabel: aboutPage?.visible && aboutPage.showInHeader ? aboutPage.headerLabel : null,
      visitEnabled: siteConfig?.visitVisible ?? false,
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
