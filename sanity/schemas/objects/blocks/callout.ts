import { defineField, defineType } from "sanity";
import { InfoOutlineIcon } from "@sanity/icons";

export const callout = defineType({
  name: "callout",
  title: "Nota destacada",
  type: "object",
  icon: InfoOutlineIcon,
  fields: [
    defineField({
      name: "tone",
      title: "Tono",
      type: "string",
      options: {
        list: [
          { title: "Tip", value: "tip" },
          { title: "Info", value: "info" },
          { title: "Atención", value: "warning" },
          { title: "Cita", value: "quote" },
        ],
        layout: "radio",
      },
      initialValue: "tip",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      description: "Opcional.",
    }),
    defineField({
      name: "body",
      title: "Contenido",
      type: "array",
      of: [{ type: "block", styles: [], lists: [], marks: { decorators: [{ title: "Bold", value: "strong" }, { title: "Italic", value: "em" }] } }],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { title: "title", tone: "tone" },
    prepare({ title, tone }) {
      const labels: Record<string, string> = { tip: "Tip", info: "Info", warning: "Atención", quote: "Cita" };
      return { title: title || `Callout (${labels[tone] ?? tone})` };
    },
  },
});
