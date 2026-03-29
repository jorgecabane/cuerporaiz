import { centerRepository, siteConfigRepository } from "@/lib/adapters/db";
import { Footer } from "./Footer";

export async function FooterServer() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return <Footer />;

  const center = await centerRepository.findBySlug(slug);
  if (!center) return <Footer />;

  const config = await siteConfigRepository.findByCenterId(center.id);

  return (
    <Footer
      centerName={center.name}
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
