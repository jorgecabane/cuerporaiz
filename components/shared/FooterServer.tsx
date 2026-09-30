import { centerRepository, siteConfigRepository } from "@/lib/adapters/db";
import { Footer } from "./Footer";
import { flattenNav, type NavItem } from "@/lib/domain/public-nav";

export async function FooterServer({ navItems }: { navItems?: NavItem[] }) {
  const navLinks = navItems ? flattenNav(navItems) : undefined;
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return <Footer navLinks={navLinks} />;

  const center = await centerRepository.findBySlug(slug);
  if (!center) return <Footer navLinks={navLinks} />;

  const config = await siteConfigRepository.findByCenterId(center.id);

  return (
    <Footer
      centerName={center.name}
      navLinks={navLinks}
      contact={{
        email: config?.contactEmail ?? undefined,
        phone: config?.contactPhone ?? undefined,
        address: config?.contactAddress ?? undefined,
        whatsappUrl: config?.whatsappUrl ?? undefined,
        instagramUrl: config?.instagramUrl ?? undefined,
        facebookUrl: config?.facebookUrl ?? undefined,
        youtubeUrl: config?.youtubeUrl ?? undefined,
      }}
    />
  );
}
