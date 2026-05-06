import { defineField, defineType } from "sanity";
import { DocumentIcon } from "@sanity/icons";

/**
 * Comprobante de transferencia bancaria subido por una alumna al hacer
 * "Ya transferí" en el checkout. El asset queda en el CDN de Sanity con
 * UUID no adivinable; sólo el panel admin lo expone vía un endpoint
 * autenticado server-side.
 */
export const paymentReceipt = defineType({
  name: "paymentReceipt",
  title: "Comprobante de transferencia",
  type: "document",
  icon: DocumentIcon,
  fields: [
    defineField({
      name: "centerId",
      title: "Centro (tenant)",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "orderId",
      title: "Order ID (Postgres)",
      type: "string",
      description: "Referencia al Order si la transferencia es de un plan.",
    }),
    defineField({
      name: "eventTicketId",
      title: "EventTicket ID (Postgres)",
      type: "string",
      description: "Referencia al EventTicket si la transferencia es de un evento.",
    }),
    defineField({
      name: "uploadedBy",
      title: "Usuario que subió",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "uploadedAt",
      title: "Subido el",
      type: "datetime",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "asset",
      title: "Archivo",
      type: "file",
      description: "JPEG, PNG, WebP o PDF.",
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: {
      title: "orderId",
      subtitle: "uploadedAt",
      eventTicketId: "eventTicketId",
    },
    prepare({ title, subtitle, eventTicketId }) {
      const date = subtitle ? new Date(subtitle).toLocaleDateString("es-CL") : "sin fecha";
      const ref = title ? `Order ${title}` : eventTicketId ? `Ticket ${eventTicketId}` : "Sin referencia";
      return { title: ref, subtitle: date };
    },
  },
});
