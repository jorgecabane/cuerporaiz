import { describe, it, expect } from "vitest";
import { buildEventTicketConfirmationEmail } from "./event";
import { defaultBranding } from "./branding";

const BASE_DATA = {
  toEmail: "user@example.com",
  eventTitle: "Retiro de Yoga",
  startsAt: new Date("2026-05-01T10:00:00Z"),
  endsAt: new Date("2026-05-01T12:00:00Z"),
  location: "Santiago, Chile",
  amountCents: 15000,
  currency: "CLP",
  branding: defaultBranding("Cuerpo Raíz"),
};

describe("buildEventTicketConfirmationEmail", () => {
  it("genera email con datos del evento", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      userName: "María",
    });

    expect(result.subject).toBe("Confirmación: Retiro de Yoga");
    expect(result.to).toEqual(["user@example.com"]);
    expect(result.html).toContain("Retiro de Yoga");
    expect(result.html).toContain("Santiago, Chile");
    expect(result.text).toContain("María");
    expect(result.text).toContain("Retiro de Yoga");
  });

  it("incluye saludo sin nombre", () => {
    const result = buildEventTicketConfirmationEmail(BASE_DATA);

    expect(result.text).toContain("Hola,");
    expect(result.html).toContain("Hola,");
  });

  it("evento gratuito muestra 'Gratis'", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      amountCents: 0,
    });

    expect(result.html).toContain("Gratis");
    expect(result.text).toContain("Gratis");
  });

  it("omite línea de location cuando no hay", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      location: null,
    });

    expect(result.html).not.toContain("Lugar:");
    expect(result.text).not.toContain("Lugar:");
  });

  it("incluye CTA cuando se proporciona eventUrl", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      eventUrl: "https://example.com/eventos/retiro",
    });

    expect(result.html).toContain("https://example.com/eventos/retiro");
    expect(result.text).toContain("Ver detalles: https://example.com/eventos/retiro");
  });

  it("omite CTA cuando no hay eventUrl", () => {
    const result = buildEventTicketConfirmationEmail(BASE_DATA);

    expect(result.text).not.toContain("Ver detalles:");
  });

  it("escapa HTML en el título del evento", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      eventTitle: "Taller <Yoga> & Meditación",
    });

    expect(result.html).toContain("Taller &lt;Yoga&gt; &amp; Meditación");
    expect(result.html).not.toContain("<Yoga>");
  });

  it("incluye el nombre del centro en el HTML", () => {
    const result = buildEventTicketConfirmationEmail(BASE_DATA);

    expect(result.html).toContain("Cuerpo Raíz");
  });

  it("quantity > 1 menciona la cantidad de cupos comprados", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      quantity: 3,
    });

    expect(result.html).toContain("3");
    expect(result.html).toContain("cupos");
    expect(result.text).toContain("3 cupos");
  });

  it("quantity = 1 no menciona cupos en plural", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      quantity: 1,
    });

    expect(result.text).toContain("Tu entrada");
    expect(result.text).not.toContain("cupos");
  });
});
