import { defineField, defineType } from "sanity";
import { LinkIcon } from "@sanity/icons";

export const ctaButton = defineType({
  name: "ctaButton",
  title: "Botón CTA",
  type: "object",
  icon: LinkIcon,
  fields: [
    defineField({
      name: "label",
      title: "Texto del botón",
      type: "string",
      validation: (r) => r.required().max(40),
    }),
    defineField({
      name: "href",
      title: "Link",
      type: "string",
      description:
        "Ruta interna (ej. /#agenda, /planes), URL externa (https://…), mailto: o tel:",
      validation: (r) =>
        r.required().custom((value) => {
          if (typeof value !== "string") return "Requerido";
          const trimmed = value.trim();
          if (!trimmed) return "Requerido";
          if (/^\//.test(trimmed)) return true;
          if (/^https?:\/\//.test(trimmed)) return true;
          if (/^mailto:/.test(trimmed)) return true;
          if (/^tel:/.test(trimmed)) return true;
          return "Debe empezar con /, https://, mailto: o tel:";
        }),
    }),
    defineField({
      name: "variant",
      title: "Estilo",
      type: "string",
      options: {
        list: [
          { title: "Primario (verde)", value: "primary" },
          { title: "Secundario (contorno)", value: "secondary" },
        ],
        layout: "radio",
      },
      initialValue: "primary",
    }),
  ],
  preview: {
    select: { label: "label", href: "href" },
    prepare({ label, href }) {
      return { title: label || "Botón CTA", subtitle: href };
    },
  },
});
