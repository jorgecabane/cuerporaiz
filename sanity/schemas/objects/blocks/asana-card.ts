import { defineField, defineType } from "sanity";
import { UserIcon } from "@sanity/icons";

export const asanaCard = defineType({
  name: "asanaCard",
  title: "Asana (postura)",
  type: "object",
  icon: UserIcon,
  description: "Ficha de una postura: foto, nombres, beneficios, nivel.",
  fields: [
    defineField({
      name: "sanskritName",
      title: "Nombre en sánscrito",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "spanishName",
      title: "Nombre en español",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "poseImage",
      title: "Foto de la postura",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt", type: "string" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "benefits",
      title: "Beneficios",
      type: "array",
      of: [{ type: "string" }],
      description: "Un beneficio por línea.",
      validation: (r) => r.required().min(1).max(6),
    }),
    defineField({
      name: "duration",
      title: "Duración sugerida",
      type: "string",
      description: 'Ej: "5 respiraciones", "3 min", "30 segundos".',
    }),
    defineField({
      name: "difficulty",
      title: "Nivel",
      type: "string",
      options: {
        list: [
          { title: "Principiante", value: "principiante" },
          { title: "Intermedio", value: "intermedio" },
          { title: "Avanzado", value: "avanzado" },
        ],
        layout: "radio",
      },
      initialValue: "principiante",
    }),
  ],
  preview: {
    select: { sanskrit: "sanskritName", spanish: "spanishName", media: "poseImage" },
    prepare({ sanskrit, spanish, media }) {
      return { title: sanskrit || spanish || "Asana", subtitle: spanish, media };
    },
  },
});
