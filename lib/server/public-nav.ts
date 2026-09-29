import {
  centerRepository,
  aboutPageRepository,
  siteConfigRepository,
  siteSectionRepository,
} from "@/lib/adapters/db";
import { NAV_LINKS, FAQ_NAV_LINK } from "@/lib/constants/copy";
import { isSanityConfigured } from "@/sanity/env";

export type PublicNavLink = { href: string; label: string };

/** Mapeo de href → campo de override en CenterSiteConfig (labels editables del header). */
const NAV_LABEL_OVERRIDE_BY_HREF: Record<string, keyof OverrideKeys> = {
  "/#agenda": "headerNavLabelInPerson",
  "/catalogo": "headerNavLabelOnline",
  "/#contacto": "headerNavLabelContact",
};

type OverrideKeys = {
  headerNavLabelInPerson: string | null;
  headerNavLabelOnline: string | null;
  headerNavLabelContact: string | null;
};

/**
 * Returns the public nav links for the current center:
 * - "Sobre" first, if the about page is visible and enabled in the header
 * - Base links from NAV_LINKS (with label overrides from siteConfig)
 * - "Preguntas frecuentes" and "Blog" before Contact, if enabled
 *
 * Server-only: call from a server component. Never throws — on error, falls
 * back to the static NAV_LINKS.
 */
export async function getPublicNavLinks(): Promise<PublicNavLink[]> {
  const base = NAV_LINKS.map((l) => ({ href: l.href, label: l.label }));
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return base;

  try {
    const center = await centerRepository.findBySlug(slug);
    if (!center) return base;

    const [aboutPage, siteConfig, sections] = await Promise.all([
      aboutPageRepository.findByCenterId(center.id),
      siteConfigRepository.findByCenterId(center.id),
      siteSectionRepository.findByCenterId(center.id),
    ]);

    const links: PublicNavLink[] = base.map((link) => {
      const overrideKey = NAV_LABEL_OVERRIDE_BY_HREF[link.href];
      const customLabel = overrideKey ? siteConfig?.[overrideKey] : null;
      return customLabel ? { ...link, label: customLabel } : link;
    });

    const insertBeforeContact = (link: PublicNavLink) => {
      const i = links.findIndex((l) => l.href === "/#contacto");
      if (i >= 0) links.splice(i, 0, link);
      else links.push(link);
    };

    if (aboutPage?.visible && aboutPage.showInHeader) {
      links.unshift({ href: "/sobre", label: aboutPage.headerLabel });
    }

    const faq = sections.find((s) => s.sectionKey === "faq");
    if (faq?.visible && faq.items.length > 0) {
      insertBeforeContact({ ...FAQ_NAV_LINK });
    }

    if (siteConfig?.blogEnabled && isSanityConfigured()) {
      insertBeforeContact({ href: "/blog", label: siteConfig.blogLabel });
    }

    return links;
  } catch {
    return base;
  }
}
