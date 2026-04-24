import { defineField, defineType } from "sanity";
import { CommentIcon } from "@sanity/icons";

export const testimonial = defineType({
  name: "testimonial",
  title: "Testimonio",
  type: "object",
  icon: CommentIcon,
  fields: [
    defineField({
      name: "quote",
      title: "Testimonio",
      type: "text",
      rows: 3,
      validation: (r) => r.required().max(500),
    }),
    defineField({
      name: "authorName",
      title: "Nombre",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "authorContext",
      title: "Contexto",
      type: "string",
      description: 'Ej: "Practicante desde 2023", "Retiro de abril".',
    }),
    defineField({
      name: "photo",
      title: "Foto",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { name: "authorName", context: "authorContext", media: "photo" },
    prepare({ name, context, media }) {
      return { title: name || "Testimonio", subtitle: context, media };
    },
  },
});
