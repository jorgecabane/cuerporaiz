import { getSiteContext } from "@/lib/seo/metadata";
import { Footer } from "./Footer";
import { flattenNav, type NavItem } from "@/lib/domain/public-nav";

export async function FooterServer({ navItems }: { navItems?: NavItem[] }) {
  const navLinks = navItems ? flattenNav(navItems) : undefined;
  const ctx = await getSiteContext();
  if (!ctx) return <Footer navLinks={navLinks} />;
  const { center, siteConfig: config } = ctx;

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
