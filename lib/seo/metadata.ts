import type { Metadata } from "next";
import { cache } from "react";
import { centerRepository, siteConfigRepository } from "@/lib/adapters/db";
import type { SiteConfig } from "@/lib/domain/site-config";
import { absoluteUrl, getSiteUrl, resolveImageUrl } from "./urls";

type Center = { id: string; name: string; slug: string };
type SiteContext = { center: Center; siteConfig: SiteConfig | null };

export const getSiteContext = cache(async (): Promise<SiteContext | null> => {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return null;
  try {
    const center = await centerRepository.findBySlug(slug);
    if (!center) return null;
    const siteConfig = await siteConfigRepository.findByCenterId(center.id);
    return {
      center: { id: center.id, name: center.name, slug: center.slug },
      siteConfig,
    };
  } catch {
    return null;
  }
});

export interface BuildSiteMetadataOpts {
  /** Page-specific title. Falls back to site name + default tagline. */
  title?: string;
  /** Page-specific description. Falls back to heroSubtitle. */
  description?: string;
  /** Path relative to site root (e.g. "/", "/sobre", "/catalogo/abc"). */
  path: string;
  /** Page-specific image. Relative or absolute. Falls back to heroImageUrl, then to /opengraph-image. */
  image?: string | null;
  /** OG type. Defaults to "website". */
  type?: "website" | "article";
  /** Marks this page as not indexable (sitemap still lists it if you add it). */
  noIndex?: boolean;
}

const DEFAULT_TAGLINE = "cuerpo, respiración y placer";
const DEFAULT_DESCRIPTION =
  "Yoga con identidad. Clases presenciales y online, membresía, retiros. El camino de regreso a ti.";

export async function buildSiteMetadata(opts: BuildSiteMetadataOpts): Promise<Metadata> {
  const ctx = await getSiteContext();
  const siteName = ctx?.center.name ?? "Cuerpo Raíz";
  const defaultTitle = `${siteName} — ${DEFAULT_TAGLINE}`;
  const defaultDescription = ctx?.siteConfig?.heroSubtitle?.trim() || DEFAULT_DESCRIPTION;

  const title = opts.title ?? defaultTitle;
  const description = opts.description ?? defaultDescription;
  const canonicalPath = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const urlAbsolute = absoluteUrl(canonicalPath);

  const explicitImage = resolveImageUrl(opts.image ?? ctx?.siteConfig?.heroImageUrl ?? null);

  const openGraphImages = explicitImage
    ? [{ url: explicitImage, width: 1200, height: 630, alt: title }]
    : undefined;
  const twitterImages = explicitImage ? [explicitImage] : undefined;

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    applicationName: siteName,
    alternates: { canonical: canonicalPath },
    robots: opts.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: urlAbsolute,
      siteName,
      locale: "es_CL",
      type: opts.type ?? "website",
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: twitterImages,
    },
  };
}
