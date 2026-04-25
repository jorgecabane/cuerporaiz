export const SECTION_KEYS = [
  "hero",
  "about",
  "how-it-works",
  "schedule",
  "plans",
  "on-demand",
  "events",
  "disciplines",
  "team",
  "testimonials",
  "cta",
  "contact",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export interface SiteConfig {
  id: string;
  centerId: string;
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  colorAccent: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappUrl: string | null;
  youtubeUrl: string | null;
  blogEnabled: boolean;
  blogLabel: string;
}

export interface SiteSection {
  id: string;
  centerId: string;
  sectionKey: SectionKey;
  title: string | null;
  subtitle: string | null;
  visible: boolean;
  sortOrder: number;
}

export interface SiteSectionItem {
  id: string;
  sectionId: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  href: string | null;
  userId: string | null;
  sortOrder: number;
}

export interface SiteSectionWithItems extends SiteSection {
  items: SiteSectionItem[];
}
