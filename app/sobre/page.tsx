import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { centerRepository, aboutPageRepository } from "@/lib/adapters/db";
import { buildSiteMetadata } from "@/lib/seo/metadata";
import {
  AboutHero,
  AboutBio,
  AboutGallery,
  AboutCTA,
} from "@/components/sections/about";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return buildSiteMetadata({ path: "/sobre", title: "Sobre" });

  const center = await centerRepository.findBySlug(slug);
  if (!center) return buildSiteMetadata({ path: "/sobre", title: "Sobre" });

  const page = await aboutPageRepository.findByCenterId(center.id);
  if (!page || !page.visible) return buildSiteMetadata({ path: "/sobre", title: "Sobre" });

  return buildSiteMetadata({
    path: "/sobre",
    title: `${page.pageTitle} · ${center.name}`,
    description: page.tagline ?? undefined,
    image: page.heroImageUrl,
  });
}

export default async function SobrePage() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) notFound();

  const center = await centerRepository.findBySlug(slug);
  if (!center) notFound();

  const page = await aboutPageRepository.findByCenterId(center.id);
  if (!page || !page.visible) notFound();

  return (
    <>
      <AboutHero
        eyebrow={page.pageEyebrow ?? undefined}
        name={page.name ?? page.pageTitle}
        tagline={page.tagline ?? undefined}
        heroImageUrl={page.heroImageUrl ?? undefined}
        ctaLabel={page.ctaLabel}
        ctaHref={page.ctaHref}
      />

      {page.bio && (
        <AboutBio heading="Mi historia" body={page.bio} background="surface" />
      )}

      {page.propuesta && (
        <AboutBio heading="Mi propuesta" body={page.propuesta} background="tertiary" />
      )}

      {page.images.length > 0 && (
        <AboutGallery
          subtitle="Pequeños fragmentos de retiros, clases y del lugar donde nos reunimos."
          images={page.images}
        />
      )}

      <AboutCTA
        heading={page.ctaLabel}
        ctaLabel="Ver la agenda"
        ctaHref={page.ctaHref}
      />
    </>
  );
}
