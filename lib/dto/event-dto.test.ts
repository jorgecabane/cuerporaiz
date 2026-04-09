import { describe, it, expect } from "vitest";
import { createEventSchema, updateEventSchema, createEventTicketSchema } from "./event-dto";

const BASE_CREATE = {
  title: "Retiro de Invierno",
  startsAt: new Date("2026-07-01T09:00:00Z"),
  endsAt: new Date("2026-07-03T18:00:00Z"),
  amountCents: 50000,
};

describe("createEventSchema", () => {
  it("acepta datos válidos mínimos", () => {
    expect(createEventSchema.safeParse(BASE_CREATE).success).toBe(true);
  });

  it("acepta datos válidos completos", () => {
    const result = createEventSchema.safeParse({
      ...BASE_CREATE,
      description: "Un retiro de yoga en la montaña",
      location: "Cajón del Maipo",
      imageUrl: "https://example.com/retiro.jpg",
      currency: "CLP",
      maxCapacity: 20,
      status: "DRAFT",
      color: "#2D3B2A",
    });
    expect(result.success).toBe(true);
  });

  it("requiere title", () => {
    const { title: _, ...rest } = BASE_CREATE;
    expect(createEventSchema.safeParse(rest).success).toBe(false);
  });

  it("rechaza title vacío", () => {
    expect(createEventSchema.safeParse({ ...BASE_CREATE, title: "" }).success).toBe(false);
  });

  it("rechaza amountCents negativo", () => {
    expect(createEventSchema.safeParse({ ...BASE_CREATE, amountCents: -1 }).success).toBe(false);
  });

  it("acepta amountCents cero (evento gratis)", () => {
    expect(createEventSchema.safeParse({ ...BASE_CREATE, amountCents: 0 }).success).toBe(true);
  });

  it("rechaza endsAt anterior a startsAt", () => {
    const result = createEventSchema.safeParse({
      ...BASE_CREATE,
      startsAt: new Date("2026-07-03T18:00:00Z"),
      endsAt: new Date("2026-07-01T09:00:00Z"),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("endsAt");
    }
  });

  it("acepta endsAt igual a startsAt (evento de un día)", () => {
    const date = new Date("2026-07-01T09:00:00Z");
    expect(createEventSchema.safeParse({ ...BASE_CREATE, startsAt: date, endsAt: date }).success).toBe(true);
  });

  it("rechaza maxCapacity cero o negativo", () => {
    expect(createEventSchema.safeParse({ ...BASE_CREATE, maxCapacity: 0 }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...BASE_CREATE, maxCapacity: -5 }).success).toBe(false);
  });

  it("rechaza imageUrl sin https", () => {
    expect(
      createEventSchema.safeParse({ ...BASE_CREATE, imageUrl: "http://example.com/img.jpg" }).success
    ).toBe(false);
  });

  it("rechaza status inválido", () => {
    expect(createEventSchema.safeParse({ ...BASE_CREATE, status: "ARCHIVED" }).success).toBe(false);
  });

  it("acepta todos los status válidos", () => {
    for (const status of ["DRAFT", "PUBLISHED", "CANCELLED"] as const) {
      expect(createEventSchema.safeParse({ ...BASE_CREATE, status }).success).toBe(true);
    }
  });
});

describe("updateEventSchema", () => {
  it("acepta objeto vacío", () => {
    expect(updateEventSchema.safeParse({}).success).toBe(true);
  });

  it("acepta actualización parcial de title", () => {
    expect(updateEventSchema.safeParse({ title: "Nuevo Nombre" }).success).toBe(true);
  });

  it("acepta actualización parcial de status", () => {
    expect(updateEventSchema.safeParse({ status: "CANCELLED" }).success).toBe(true);
  });

  it("rechaza endsAt anterior a startsAt cuando ambos se proveen", () => {
    const result = updateEventSchema.safeParse({
      startsAt: new Date("2026-07-03T18:00:00Z"),
      endsAt: new Date("2026-07-01T09:00:00Z"),
    });
    expect(result.success).toBe(false);
  });

  it("acepta endsAt sin startsAt (no valida cruce)", () => {
    expect(updateEventSchema.safeParse({ endsAt: new Date("2026-07-01T09:00:00Z") }).success).toBe(true);
  });

  it("acepta nullable en campos opcionales", () => {
    expect(updateEventSchema.safeParse({ description: null, location: null, imageUrl: null }).success).toBe(true);
  });

  it("rechaza amountCents negativo", () => {
    expect(updateEventSchema.safeParse({ amountCents: -100 }).success).toBe(false);
  });
});

describe("createEventTicketSchema", () => {
  it("acepta eventId válido", () => {
    expect(createEventTicketSchema.safeParse({ eventId: "clx1234567890" }).success).toBe(true);
  });

  it("rechaza eventId vacío", () => {
    expect(createEventTicketSchema.safeParse({ eventId: "" }).success).toBe(false);
  });

  it("rechaza sin eventId", () => {
    expect(createEventTicketSchema.safeParse({}).success).toBe(false);
  });
});
