import { defineField, defineType } from "sanity";
import { BlockquoteIcon } from "@sanity/icons";

export const pullQuote = defineType({
  name: "pullQuote",
  title: "Cita destacada",
  type: "object",
  icon: BlockquoteIcon,
  fields: [
    defineField({
      name: "quote",
      title: "Cita",
      type: "text",
      rows: 3,
      validation: (r) => r.required().max(400),
    }),
    defineField({
      name: "attribution",
      title: "Atribución",
      type: "string",
      description: "Autor o fuente. Opcional.",
    }),
  ],
  preview: {
    select: { quote: "quote", attribution: "attribution" },
    prepare({ quote, attribution }) {
      return {
        title: quote?.slice(0, 80) ?? "Cita destacada",
        subtitle: attribution ? `— ${attribution}` : undefined,
      };
    },
  },
});
