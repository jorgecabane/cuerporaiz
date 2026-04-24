import type { PortableTextBlock } from "@portabletext/types";

export type SanityImage = {
  _type: "image";
  asset: { _ref: string; _type: "reference" };
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string;
  caption?: string;
};

export type PostCategoryRef = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
};

export type PostAuthorRef = {
  _id: string;
  name: string;
  slug: string;
  role?: string;
  photo?: SanityImage;
  bio?: string;
  socials?: { instagram?: string; web?: string };
};

export type PostSummary = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: SanityImage;
  publishedAt: string;
  readingMinutes?: number;
  author: Pick<PostAuthorRef, "name" | "photo">;
  category: Pick<PostCategoryRef, "name" | "slug">;
};

export type PostDetail = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: SanityImage;
  publishedAt: string;
  readingMinutes?: number;
  categories: Pick<PostCategoryRef, "_id" | "name" | "slug" | "description">[];
  author: PostAuthorRef;
  body: PortableTextBlock[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: SanityImage;
  };
};
