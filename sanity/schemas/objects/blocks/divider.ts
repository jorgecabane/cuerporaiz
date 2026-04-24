import { defineField, defineType } from "sanity";
import { RemoveIcon } from "@sanity/icons";

export const divider = defineType({
  name: "divider",
  title: "Separador",
  type: "object",
  icon: RemoveIcon,
  fields: [
    defineField({
      name: "style",
      title: "Estilo",
      type: "string",
      options: {
        list: [
          { title: "Línea simple", value: "line" },
          { title: "Ornamento", value: "ornament" },
          { title: "Loto", value: "lotus" },
        ],
        layout: "radio",
      },
      initialValue: "line",
    }),
  ],
  preview: {
    select: { style: "style" },
    prepare({ style }) {
      return { title: `Separador (${style ?? "line"})` };
    },
  },
});
