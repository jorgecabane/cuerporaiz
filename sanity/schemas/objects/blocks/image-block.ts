import { defineField, defineType } from "sanity";
import { ImageIcon } from "@sanity/icons";

export const imageBlock = defineType({
  name: "imageBlock",
  title: "Imagen",
  type: "object",
  icon: ImageIcon,
  fields: [
    defineField({
      name: "asset",
      title: "Imagen",
      type: "image",
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "alt",
      title: "Texto alternativo (accesibilidad)",
      type: "string",
      description: "Describe la imagen para personas que no la pueden ver.",
      validation: (r) => r.required().min(3),
    }),
    defineField({
      name: "caption",
      title: "Pie de foto",
      type: "string",
      description: "Opcional. Se muestra debajo en cursiva.",
    }),
    defineField({
      name: "fullBleed",
      title: "Imagen a todo el ancho",
      type: "boolean",
      description: "Rompe el max-width para que la imagen ocupe todo el ancho del viewport.",
      initialValue: false,
    }),
  ],
  preview: {
    select: { media: "asset", alt: "alt", caption: "caption" },
    prepare({ media, alt, caption }) {
      return { title: caption || alt || "Imagen", media };
    },
  },
});
