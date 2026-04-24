import { defineField, defineType } from "sanity";
import { SplitHorizontalIcon } from "@sanity/icons";

const inlineBlock = {
  type: "block",
  styles: [
    { title: "Normal", value: "normal" },
    { title: "Subtítulo", value: "h4" },
  ],
  lists: [{ title: "Bullet", value: "bullet" }],
  marks: {
    decorators: [
      { title: "Bold", value: "strong" },
      { title: "Italic", value: "em" },
    ],
    annotations: [
      {
        name: "link",
        type: "object",
        title: "Link",
        fields: [{ name: "href", type: "url", title: "URL" }],
      },
    ],
  },
};

export const twoColumn = defineType({
  name: "twoColumn",
  title: "Dos columnas",
  type: "object",
  icon: SplitHorizontalIcon,
  fields: [
    defineField({
      name: "ratio",
      title: "Proporción",
      type: "string",
      options: {
        list: [
          { title: "50 / 50", value: "50-50" },
          { title: "33 / 67", value: "33-67" },
          { title: "67 / 33", value: "67-33" },
        ],
        layout: "radio",
      },
      initialValue: "50-50",
    }),
    defineField({
      name: "left",
      title: "Columna izquierda",
      type: "array",
      of: [inlineBlock, { type: "imageBlock" }],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "right",
      title: "Columna derecha",
      type: "array",
      of: [inlineBlock, { type: "imageBlock" }],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { ratio: "ratio" },
    prepare({ ratio }) {
      return { title: `Dos columnas (${ratio ?? "50-50"})` };
    },
  },
});
