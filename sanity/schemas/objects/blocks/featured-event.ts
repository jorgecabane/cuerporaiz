import { defineField, defineType } from "sanity";
import { CalendarIcon } from "@sanity/icons";

export const featuredEvent = defineType({
  name: "featuredEvent",
  title: "Evento / retiro destacado",
  type: "object",
  icon: CalendarIcon,
  description: "Tarjeta que promociona un retiro o taller dentro del artículo.",
  fields: [
    defineField({
      name: "eyebrow",
      title: "Etiqueta",
      type: "string",
      initialValue: "Próximo retiro",
    }),
    defineField({
      name: "title",
      title: "Título del evento",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "dateLabel",
      title: "Fecha (texto)",
      type: "string",
      description: 'Ej: "16 – 18 mayo 2026".',
      validation: (r) => r.required(),
    }),
    defineField({
      name: "location",
      title: "Ubicación",
      type: "string",
      description: 'Ej: "Cajón del Maipo".',
    }),
    defineField({
      name: "description",
      title: "Descripción breve",
      type: "text",
      rows: 2,
      validation: (r) => r.max(220),
    }),
    defineField({
      name: "image",
      title: "Foto",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt", type: "string" }],
    }),
    defineField({
      name: "ctaLabel",
      title: "Texto del botón",
      type: "string",
      initialValue: "Ver detalles",
    }),
    defineField({
      name: "ctaHref",
      title: "Link del botón",
      type: "string",
      description:
        'Ruta interna (ej. "/#proximos-eventos") o URL externa (https://…).',
      validation: (r) =>
        r.required().custom((value) => {
          if (typeof value !== "string") return "Requerido";
          const v = value.trim();
          if (/^\//.test(v)) return true;
          if (/^https?:\/\//.test(v)) return true;
          return "Usa / o https://";
        }),
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "dateLabel", media: "image" },
  },
});
