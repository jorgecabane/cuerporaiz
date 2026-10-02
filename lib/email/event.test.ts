import { describe, it, expect } from "vitest";
import { buildEventTicketConfirmationEmail, buildEventRegistrationNoticeToAdminEmail } from "./event";
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

  it("kind=addition usa subject de cupos adicionales", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      quantity: 5,
      kind: "addition",
      addedQuantity: 2,
    });

    expect(result.subject).toBe("Cupos adicionales confirmados: Retiro de Yoga");
  });

  it("kind=addition menciona cupos agregados y total nuevo", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      quantity: 5,
      kind: "addition",
      addedQuantity: 2,
    });

    expect(result.html).toContain("Agregaste");
    expect(result.html).toContain("<strong>2</strong>");
    expect(result.html).toContain("<strong style=\"color:#2A2A2A;\">5</strong>");
    expect(result.text).toContain("Agregaste 2 cupos");
    expect(result.text).toContain("5 entradas");
  });

  it("kind=addition con 1 cupo agregado usa singular", () => {
    const result = buildEventTicketConfirmationEmail({
      ...BASE_DATA,
      quantity: 4,
      kind: "addition",
      addedQuantity: 1,
    });

    expect(result.text).toContain("Agregaste 1 cupo a");
    expect(result.text).toContain("4 entradas");
  });
});


describe("buildEventRegistrationNoticeToAdminEmail", () => {
  const base = {
    toEmail: "admin@centro.cl",
    eventTitle: "Clase Recuperativa",
    startsAt: new Date("2026-10-02T21:30:00Z"),
    buyerName: "Ana Pérez",
    buyerEmail: "ana@correo.cl",
    buyerPhone: "+56911111111",
    quantity: 2,
    kind: "purchase" as const,
    amountCents: 0,
    currency: "CLP",
    paidSeats: 9,
    maxCapacity: 12,
    adminEventUrl: "https://cuerporaiz.cl/panel/eventos/e1",
    branding: defaultBranding("Cuerpo Raíz"),
  };

  it("avisa nueva inscripción con contacto, valor y ocupación", () => {
    const dto = buildEventRegistrationNoticeToAdminEmail(base);
    expect(dto.to).toEqual(["admin@centro.cl"]);
    expect(dto.subject).toBe("Nueva inscripción: Clase Recuperativa — Ana Pérez");
    expect(dto.html).toContain("Ana Pérez se inscribió (2 cupos).");
    expect(dto.html).toContain("ana@correo.cl · +56911111111");
    expect(dto.html).toContain("Gratis");
    expect(dto.html).toContain("9 de 12 cupos confirmados");
    expect(dto.html).toContain("/panel/eventos/e1");
    expect(dto.text).toContain("Ver inscritos: https://cuerporaiz.cl/panel/eventos/e1");
  });

  it("cupos adicionales, sin capacidad máxima y sin teléfono", () => {
    const dto = buildEventRegistrationNoticeToAdminEmail({ ...base, kind: "addition", quantity: 1, buyerPhone: null, maxCapacity: null, paidSeats: 1 });
    expect(dto.subject).toBe("Cupos adicionales: Clase Recuperativa — Ana Pérez");
    expect(dto.html).toContain("Ana Pérez sumó 1 cupo a su inscripción.");
    expect(dto.html).toContain("1 cupo confirmado");
    expect(dto.html).not.toContain("·  ");
  });

  it("escapa HTML del nombre", () => {
    const dto = buildEventRegistrationNoticeToAdminEmail({ ...base, buyerName: "<b>x</b>" });
    expect(dto.html).not.toContain("<b>x</b>");
    expect(dto.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
