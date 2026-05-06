import { centerRepository, aboutPageRepository, siteConfigRepository } from "@/lib/adapters/db";
import { NAV_LINKS } from "@/lib/constants/copy";
import { isSanityConfigured } from "@/sanity/env";

export type PublicNavLink = { href: string; label: string };

/**
 * Returns the public nav links for the current center:
 * - Base links from NAV_LINKS
 * - "Sobre" link inserted before Contact if enabled and about page is visible
 * - "Blog" link inserted before Contact if enabled and Sanity is configured
 *
 * Server-only: call from a server component. Never throws — on error, falls
 * back to the static NAV_LINKS.
 */
/** Mapeo de href → campo de override en CenterSiteConfig (item 6: header labels editables). */
const NAV_LABEL_OVERRIDE_BY_HREF: Record<string, keyof OverrideKeys> = {
  "/#como-funciona": "headerNavLabelHowItWorks",
  "/#agenda": "headerNavLabelInPerson",
  "/catalogo": "headerNavLabelOnline",
  "/#contacto": "headerNavLabelContact",
};

type OverrideKeys = {
  headerNavLabelHowItWorks: string | null;
  headerNavLabelInPerson: string | null;
  headerNavLabelOnline: string | null;
  headerNavLabelContact: string | null;
};

export async function getPublicNavLinks(): Promise<PublicNavLink[]> {
  const base = NAV_LINKS.map((l) => ({ href: l.href, label: l.label }));
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return base;

  try {
    const center = await centerRepository.findBySlug(slug);
    if (!center) return base;

    const [aboutPage, siteConfig] = await Promise.all([
      aboutPageRepository.findByCenterId(center.id),
      siteConfigRepository.findByCenterId(center.id),
    ]);

    // Aplica overrides de los labels del header desde siteConfig si existen.
    const links: PublicNavLink[] = base.map((link) => {
      const overrideKey = NAV_LABEL_OVERRIDE_BY_HREF[link.href];
      if (!overrideKey || !siteConfig) return link;
      const customLabel = siteConfig[overrideKey];
      return customLabel ? { ...link, label: customLabel } : link;
    });

    const contactIndex = () => links.findIndex((l) => l.href === "/#contacto");

    const insertBeforeContact = (link: PublicNavLink) => {
      const i = contactIndex();
      if (i >= 0) links.splice(i, 0, link);
      else links.push(link);
    };

    if (aboutPage?.visible && aboutPage.showInHeader) {
      insertBeforeContact({ href: "/sobre", label: aboutPage.headerLabel });
    }

    if (siteConfig?.blogEnabled && isSanityConfigured()) {
      insertBeforeContact({ href: "/blog", label: siteConfig.blogLabel });
    }

    return links;
  } catch {
    return base;
  }
}
