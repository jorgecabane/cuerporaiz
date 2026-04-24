import { defineField, defineType } from "sanity";
import { ChevronRightIcon } from "@sanity/icons";

export const toggleBlock = defineType({
  name: "toggleBlock",
  title: "Desplegable (toggle)",
  type: "object",
  icon: ChevronRightIcon,
  description: "Bloque que se expande/colapsa. Útil para FAQs o contenido opcional.",
  fields: [
    defineField({
      name: "summary",
      title: "Título visible",
      type: "string",
      validation: (r) => r.required().max(120),
    }),
    defineField({
      name: "body",
      title: "Contenido",
      type: "array",
      of: [
        {
          type: "block",
          styles: [{ title: "Normal", value: "normal" }],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numerada", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
            ],
          },
        },
      ],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { summary: "summary" },
    prepare({ summary }) {
      return { title: `▸ ${summary || "Desplegable"}` };
    },
  },
});
