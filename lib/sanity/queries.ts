/**
 * GROQ queries. Tipadas via lib/sanity/types.
 * Mantener en sincronía con los schemas en sanity/schemas/.
 */

const POST_SUMMARY_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  coverImage,
  publishedAt,
  readingMinutes,
  "author": author->{ name, photo },
  "category": categories[0]->{ name, "slug": slug.current }
`;

export const QUERY_ALL_POSTS = `
  *[_type == "post" && defined(slug.current) && publishedAt <= now()]
  | order(publishedAt desc) {
    ${POST_SUMMARY_FIELDS}
  }
`;

export const QUERY_FEATURED_POST = `
  *[_type == "post" && defined(slug.current) && publishedAt <= now()]
  | order(publishedAt desc)[0] {
    ${POST_SUMMARY_FIELDS}
  }
`;

export const QUERY_POSTS_BY_CATEGORY = `
  *[_type == "post" && defined(slug.current) && publishedAt <= now()
    && $slug in categories[]->slug.current]
  | order(publishedAt desc) {
    ${POST_SUMMARY_FIELDS}
  }
`;

export const QUERY_POST_BY_SLUG = `
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    coverImage,
    publishedAt,
    readingMinutes,
    "categories": categories[]->{ _id, name, "slug": slug.current, description },
    "author": author->{
      _id,
      name,
      "slug": slug.current,
      role,
      photo,
      bio,
      socials
    },
    body[]{
      ...,
      _type == "imageBlock" => { ..., asset-> },
      _type == "gallery" => { ..., images[]{ ..., asset-> } },
      _type == "asanaCard" => { ..., poseImage{ ..., asset-> } },
      _type == "testimonial" => { ..., photo{ ..., asset-> } },
      markDefs[]{ ... }
    },
    seo
  }
`;

export const QUERY_RELATED_POSTS = `
  *[_type == "post"
    && defined(slug.current)
    && publishedAt <= now()
    && slug.current != $slug
    && count(categories[@._ref in $categoryIds]) > 0
  ] | order(publishedAt desc)[0...3] {
    ${POST_SUMMARY_FIELDS}
  }
`;

export const QUERY_ALL_CATEGORIES = `
  *[_type == "category" && defined(slug.current)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description
  }
`;

export const QUERY_CATEGORY_BY_SLUG = `
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description
  }
`;

export const QUERY_POST_SLUGS = `
  *[_type == "post" && defined(slug.current)].slug.current
`;
