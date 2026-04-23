import { defineField, defineType } from "sanity";

export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "metaTitle",
      title: "Título SEO",
      type: "string",
      description: "Opcional. Si se deja vacío, se usa el título del post.",
      validation: (r) => r.max(70),
    }),
    defineField({
      name: "metaDescription",
      title: "Descripción SEO",
      type: "text",
      rows: 3,
      description: "Opcional. Si se deja vacío, se usa el excerpt.",
      validation: (r) => r.max(160),
    }),
    defineField({
      name: "ogImage",
      title: "Imagen para redes (OG)",
      type: "image",
      description: "Opcional. Si se deja vacío, se usa la imagen de portada.",
      options: { hotspot: true },
    }),
  ],
});
