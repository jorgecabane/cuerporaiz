import { z } from "zod";

export const createEventSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    location: z.string().optional(),
    imageUrl: z.string().url().startsWith("https://").optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    amountCents: z.number().int().min(0),
    currency: z.string().min(1).optional(),
    maxCapacity: z.number().int().min(1).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
    color: z.string().optional(),
  })
  .refine((data) => data.endsAt >= data.startsAt, {
    message: "endsAt debe ser igual o posterior a startsAt",
    path: ["endsAt"],
  });

export type CreateEventBody = z.infer<typeof createEventSchema>;

export const updateEventSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    imageUrl: z.string().url().startsWith("https://").nullable().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    amountCents: z.number().int().min(0).optional(),
    currency: z.string().min(1).optional(),
    maxCapacity: z.number().int().min(1).nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
    color: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) return data.endsAt >= data.startsAt;
      return true;
    },
    {
      message: "endsAt debe ser igual o posterior a startsAt",
      path: ["endsAt"],
    }
  );

export type UpdateEventBody = z.infer<typeof updateEventSchema>;

export const createEventTicketSchema = z.object({
  eventId: z.string().min(1),
});

export type CreateEventTicketBody = z.infer<typeof createEventTicketSchema>;
