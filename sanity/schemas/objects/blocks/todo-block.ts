import { defineField, defineType } from "sanity";
import { CheckmarkIcon } from "@sanity/icons";

export const todoBlock = defineType({
  name: "todoBlock",
  title: "Checklist (to-do)",
  type: "object",
  icon: CheckmarkIcon,
  description: "Lista con casillas (decorativas).",
  fields: [
    defineField({
      name: "items",
      title: "Items",
      type: "array",
      of: [
        {
          type: "object",
          name: "todoItem",
          fields: [
            { name: "text", title: "Texto", type: "string", validation: (r) => r.required() },
            { name: "checked", title: "¿Marcado?", type: "boolean", initialValue: false },
          ],
          preview: {
            select: { text: "text", checked: "checked" },
            prepare({ text, checked }) {
              return { title: `${checked ? "[x]" : "[ ]"} ${text || ""}` };
            },
          },
        },
      ],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { items: "items" },
    prepare({ items }) {
      const count = Array.isArray(items) ? items.length : 0;
      return { title: `Checklist · ${count} items` };
    },
  },
});
