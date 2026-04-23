import { defineField, defineType } from "sanity";
import { UlistIcon } from "@sanity/icons";

export const breathPattern = defineType({
  name: "breathPattern",
  title: "Pranayama (patrón de respiración)",
  type: "object",
  icon: UlistIcon,
  description: "Visualizador animado de una respiración guiada. Ej: 4-7-8, box breathing.",
  fields: [
    defineField({
      name: "name",
      title: "Nombre",
      type: "string",
      description: 'Ej: "Respiración 4-7-8", "Box breathing".',
      validation: (r) => r.required(),
    }),
    defineField({
      name: "phases",
      title: "Fases del ciclo",
      type: "array",
      of: [
        {
          type: "object",
          name: "phase",
          fields: [
            {
              name: "label",
              title: "Tipo",
              type: "string",
              options: {
                list: [
                  { title: "Inhalar", value: "inhale" },
                  { title: "Retener (pulmones llenos)", value: "hold-in" },
                  { title: "Exhalar", value: "exhale" },
                  { title: "Retener (pulmones vacíos)", value: "hold-out" },
                ],
              },
              validation: (r) => r.required(),
            },
            {
              name: "seconds",
              title: "Segundos",
              type: "number",
              validation: (r) => r.required().min(1).max(60),
            },
          ],
          preview: {
            select: { label: "label", seconds: "seconds" },
            prepare({ label, seconds }) {
              return { title: `${label ?? "fase"} · ${seconds ?? 0}s` };
            },
          },
        },
      ],
      validation: (r) => r.required().min(2).max(6),
    }),
    defineField({
      name: "rounds",
      title: "Número de ciclos",
      type: "number",
      initialValue: 4,
      validation: (r) => r.required().min(1).max(20),
    }),
    defineField({
      name: "description",
      title: "Descripción breve",
      type: "text",
      rows: 2,
    }),
  ],
  preview: {
    select: { name: "name", rounds: "rounds" },
    prepare({ name, rounds }) {
      return { title: name || "Pranayama", subtitle: `${rounds ?? 0} ciclos` };
    },
  },
});
