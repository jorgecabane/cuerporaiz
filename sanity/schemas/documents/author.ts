import { defineField, defineType } from "sanity";
import { UserIcon } from "@sanity/icons";

export const author = defineType({
  name: "author",
  title: "Autor",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "name",
      title: "Nombre",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "role",
      title: "Rol",
      type: "string",
      description: 'Ej: "Guía de yoga y meditación".',
    }),
    defineField({
      name: "photo",
      title: "Foto",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt", type: "string" }],
    }),
    defineField({
      name: "bio",
      title: "Bio corta",
      type: "text",
      rows: 4,
      validation: (r) => r.max(600),
    }),
    defineField({
      name: "socials",
      title: "Redes",
      type: "object",
      fields: [
        { name: "instagram", title: "Instagram", type: "url" },
        { name: "web", title: "Web", type: "url" },
      ],
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "role", media: "photo" },
  },
});
