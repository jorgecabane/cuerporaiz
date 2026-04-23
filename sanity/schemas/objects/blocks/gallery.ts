import { defineField, defineType } from "sanity";
import { ImagesIcon } from "@sanity/icons";

export const gallery = defineType({
  name: "gallery",
  title: "Galería",
  type: "object",
  icon: ImagesIcon,
  fields: [
    defineField({
      name: "images",
      title: "Imágenes",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              title: "Texto alternativo",
              type: "string",
              validation: (r) => r.required().min(3),
            },
            { name: "caption", title: "Pie de foto", type: "string" },
          ],
        },
      ],
      validation: (r) => r.required().min(2).max(12),
    }),
    defineField({
      name: "layout",
      title: "Disposición",
      type: "string",
      options: {
        list: [
          { title: "Grilla", value: "grid" },
          { title: "Carousel", value: "carousel" },
          { title: "Mosaico (masonry)", value: "masonry" },
        ],
        layout: "radio",
      },
      initialValue: "grid",
    }),
  ],
  preview: {
    select: { images: "images" },
    prepare({ images }) {
      const count = Array.isArray(images) ? images.length : 0;
      return { title: `Galería · ${count} imágenes` };
    },
  },
});
