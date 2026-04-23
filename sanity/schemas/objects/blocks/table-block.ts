import { defineField, defineType } from "sanity";
import { ThLargeIcon } from "@sanity/icons";

export const tableBlock = defineType({
  name: "tableBlock",
  title: "Tabla",
  type: "object",
  icon: ThLargeIcon,
  fields: [
    defineField({
      name: "hasHeaderRow",
      title: "Primera fila es encabezado",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "rows",
      title: "Filas",
      type: "array",
      of: [
        {
          type: "object",
          name: "row",
          fields: [
            {
              name: "cells",
              title: "Celdas",
              type: "array",
              of: [{ type: "string" }],
              validation: (r) => r.required().min(1),
            },
          ],
          preview: {
            select: { cells: "cells" },
            prepare({ cells }) {
              const joined = Array.isArray(cells) ? cells.join(" · ") : "";
              return { title: joined.slice(0, 80) || "Fila vacía" };
            },
          },
        },
      ],
      validation: (r) => r.required().min(1),
    }),
  ],
  preview: {
    select: { rows: "rows" },
    prepare({ rows }) {
      const count = Array.isArray(rows) ? rows.length : 0;
      return { title: `Tabla · ${count} filas` };
    },
  },
});
