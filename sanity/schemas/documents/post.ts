import { defineArrayMember, defineField, defineType } from "sanity";
import { DocumentTextIcon } from "@sanity/icons";

export const post = defineType({
  name: "post",
  title: "Artículo",
  type: "document",
  icon: DocumentTextIcon,
  groups: [
    { name: "content", title: "Contenido", default: true },
    { name: "meta", title: "Metadata" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      group: "content",
      validation: (r) => r.required().max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Resumen",
      type: "text",
      rows: 3,
      description: "Se muestra en las tarjetas del blog y como meta description por defecto.",
      group: "content",
      validation: (r) => r.required().min(20).max(220),
    }),
    defineField({
      name: "coverImage",
      title: "Imagen de portada",
      type: "image",
      group: "content",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          title: "Texto alternativo",
          type: "string",
          validation: (r) => r.required(),
        },
        { name: "caption", title: "Pie de foto", type: "string" },
      ],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "author",
      title: "Autor",
      type: "reference",
      group: "meta",
      to: [{ type: "author" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "categories",
      title: "Categorías",
      type: "array",
      group: "meta",
      of: [{ type: "reference", to: [{ type: "category" }] }],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "publishedAt",
      title: "Fecha de publicación",
      type: "datetime",
      group: "meta",
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: "readingMinutes",
      title: "Minutos de lectura",
      type: "number",
      group: "meta",
      description: "Opcional. Si se deja vacío, se estima desde el contenido.",
      validation: (r) => r.min(1).max(60),
    }),
    defineField({
      name: "body",
      title: "Cuerpo del artículo",
      type: "array",
      group: "content",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Título 2", value: "h2" },
            { title: "Título 3", value: "h3" },
            { title: "Título 4", value: "h4" },
            { title: "Cita", value: "blockquote" },
          ],
          lists: [
            { title: "Lista con viñetas", value: "bullet" },
            { title: "Lista numerada", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Negrita", value: "strong" },
              { title: "Cursiva", value: "em" },
              { title: "Tachado", value: "strike-through" },
              { title: "Código", value: "code" },
            ],
            annotations: [
              {
                name: "link",
                title: "Enlace",
                type: "object",
                fields: [
                  {
                    name: "href",
                    title: "URL",
                    type: "string",
                    validation: (r) =>
                      r.required().custom((value) => {
                        if (typeof value !== "string") return "Requerido";
                        const v = value.trim();
                        if (/^\//.test(v)) return true;
                        if (/^https?:\/\//.test(v)) return true;
                        if (/^mailto:/.test(v)) return true;
                        if (/^tel:/.test(v)) return true;
                        return "Usa /, https://, mailto: o tel:";
                      }),
                  },
                  {
                    name: "openInNewTab",
                    title: "Abrir en nueva pestaña",
                    type: "boolean",
                    initialValue: false,
                  },
                ],
              },
            ],
          },
        }),
        defineArrayMember({ type: "imageBlock" }),
        defineArrayMember({ type: "pullQuote" }),
        defineArrayMember({ type: "callout" }),
        defineArrayMember({ type: "ctaButton" }),
        defineArrayMember({ type: "divider" }),
        defineArrayMember({ type: "gallery" }),
        defineArrayMember({ type: "embed" }),
        defineArrayMember({ type: "twoColumn" }),
        defineArrayMember({ type: "tableBlock" }),
        defineArrayMember({ type: "toggleBlock" }),
        defineArrayMember({ type: "todoBlock" }),
        defineArrayMember({ type: "asanaCard" }),
        defineArrayMember({ type: "breathPattern" }),
        defineArrayMember({ type: "featuredEvent" }),
        defineArrayMember({ type: "testimonial" }),
      ],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seo",
      group: "seo",
    }),
  ],
  orderings: [
    {
      title: "Publicación (más reciente)",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "title", media: "coverImage", date: "publishedAt" },
    prepare({ title, media, date }) {
      const d = date ? new Date(date).toLocaleDateString("es-CL") : "sin fecha";
      return { title: title || "Sin título", subtitle: d, media };
    },
  },
});
