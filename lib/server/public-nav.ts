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

    const links: PublicNavLink[] = [...base];
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
