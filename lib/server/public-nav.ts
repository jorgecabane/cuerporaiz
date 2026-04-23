import { centerRepository, aboutPageRepository } from "@/lib/adapters/db";
import { NAV_LINKS } from "@/lib/constants/copy";

export type PublicNavLink = { href: string; label: string };

/**
 * Returns the public nav links for the current center, inserting the "About"
 * page link before Contact if the admin enabled it.
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

    const aboutPage = await aboutPageRepository.findByCenterId(center.id);
    if (!aboutPage?.visible || !aboutPage.showInHeader) return base;

    const link: PublicNavLink = { href: "/sobre", label: aboutPage.headerLabel };
    const contactIndex = base.findIndex((l) => l.href === "/#contacto");
    if (contactIndex >= 0) {
      return [...base.slice(0, contactIndex), link, ...base.slice(contactIndex)];
    }
    return [...base, link];
  } catch {
    return base;
  }
}
