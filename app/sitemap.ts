import type { MetadataRoute } from "next";
import {
  centerRepository,
  siteConfigRepository,
  aboutPageRepository,
  onDemandCategoryRepository,
  siteSectionRepository,
} from "@/lib/adapters/db";
import { toFaqItems } from "@/lib/domain/site-config";
import { isSanityConfigured, sanityFetch } from "@/lib/sanity/client";
import { QUERY_POST_SLUGS } from "@/lib/sanity/queries";
import { absoluteUrl } from "@/lib/seo/urls";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1.0 },
  ];

  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  if (!slug) return entries;

  try {
    const center = await centerRepository.findBySlug(slug);
    if (!center) return entries;

    const [aboutPage, siteConfig, categories, sections] = await Promise.all([
      aboutPageRepository.findByCenterId(center.id),
      siteConfigRepository.findByCenterId(center.id),
      onDemandCategoryRepository.findPublishedByCenterId(center.id),
      siteSectionRepository.findByCenterId(center.id),
    ]);

    if (aboutPage?.visible) {
      entries.push({
        url: absoluteUrl("/sobre"),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    entries.push({
      url: absoluteUrl("/horarios"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });

    if (siteConfig?.visitVisible) {
      entries.push({
        url: absoluteUrl("/conocenos"),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    entries.push({
      url: absoluteUrl("/eventos"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    const faq = sections.find((s) => s.sectionKey === "faq");
    if (faq?.visible && toFaqItems(faq.items).length > 0) {
      entries.push({
        url: absoluteUrl("/preguntas-frecuentes"),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    entries.push({
      url: absoluteUrl("/catalogo"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });

    for (const cat of categories) {
      entries.push({
        url: absoluteUrl(`/catalogo/${cat.id}`),
        lastModified: cat.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    if (siteConfig?.blogEnabled && isSanityConfigured()) {
      entries.push({
        url: absoluteUrl("/blog"),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
      const slugs =
        (await sanityFetch<string[]>(QUERY_POST_SLUGS, {}, { revalidate: 300 })) ?? [];
      for (const postSlug of slugs) {
        entries.push({
          url: absoluteUrl(`/blog/${postSlug}`),
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
  } catch {
    // best-effort: on any DB/CMS error, return what we have
  }

  return entries;
}
