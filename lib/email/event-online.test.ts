import { describe, it, expect } from "vitest";
import { buildEventTicketConfirmationEmail } from "./event";
import { buildEventAttendeeLinkEmail, buildEventOnlineReminderEmail, entryLinksFor } from "./event-online";
import { defaultBranding } from "./branding";

const branding = defaultBranding("Cuerpo Raíz");

const attendee = (seat: number, name: string | null, email: string | null) => ({
  id: `a${seat}`,
  ticketId: "t1",
  seat,
  token: `tok${seat}`,
  name,
  email,
  firstEnteredAt: null,
  lastEnteredAt: null,
  revokedAt: null,
});
const attendees = [attendee(1, null, null), attendee(2, "Ana", "ana@correo.cl"), attendee(3, null, null)];

describe("entryLinksFor", () => {
  it("etiqueta 'Entrada N' con tú / nombre / nada", () => {
    const links = entryLinksFor(attendees, "yo@correo.cl");
    expect(links.map((l) => l.label)).toEqual(["Entrada 1 · tú", "Entrada 2 · Ana", "Entrada 3"]);
    expect(links[1].url).toMatch(/\/eventos\/entrar\/tok2$/);
  });

  it("asistente con el correo del comprador → tú", () => {
    expect(entryLinksFor([attendee(2, null, "yo@correo.cl")], "yo@correo.cl")[0].label).toBe("Entrada 2 · tú");
  });
});

describe("confirmación con links", () => {
  const base = {
    toEmail: "yo@correo.cl",
    eventTitle: "Círculo online",
    startsAt: new Date("2026-11-01T22:00:00Z"),
    endsAt: new Date("2026-11-01T23:00:00Z"),
    location: null,
    amountCents: 0,
    currency: "CLP",
    branding,
  };

  it("incluye 'Tus entradas' y cada link cuando hay entryLinks", () => {
    const email = buildEventTicketConfirmationEmail({
      ...base,
      quantity: 3,
      entryLinks: entryLinksFor(attendees, "yo@correo.cl"),
    });
    expect(email.html).toContain("Tus entradas");
    expect(email.html).toContain("/eventos/entrar/tok1");
    expect(email.text).toContain("/eventos/entrar/tok2");
  });

  it("sin entryLinks no agrega el bloque (evento presencial)", () => {
    expect(buildEventTicketConfirmationEmail(base).html).not.toContain("Tus entradas");
  });
});

describe("buildEventAttendeeLinkEmail", () => {
  const data = {
    toEmail: "ana@correo.cl",
    attendeeName: "Ana",
    buyerName: "Jorge",
    eventTitle: "Círculo online",
    startsAt: new Date("2026-11-01T22:00:00Z"),
    entryUrl: "https://x.cl/eventos/entrar/tok2",
    branding,
  };

  it("va al asistente con su link y menciona al comprador", () => {
    const email = buildEventAttendeeLinkEmail(data);
    expect(email.to).toEqual(["ana@correo.cl"]);
    expect(email.subject).toBe("Tienes una entrada para Círculo online");
    expect(email.html).toContain("https://x.cl/eventos/entrar/tok2");
    expect(email.html).toContain("Jorge");
    expect(email.text).toContain("https://x.cl/eventos/entrar/tok2");
  });

  it("sin nombre saluda genérico y escapa HTML en nombres", () => {
    expect(buildEventAttendeeLinkEmail({ ...data, attendeeName: null }).html).toContain("<p>Hola,</p>");
    expect(buildEventAttendeeLinkEmail({ ...data, buyerName: "<b>x</b>" }).html).not.toContain("<b>x</b>");
  });
});

describe("buildEventOnlineReminderEmail", () => {
  it("lista todos los links recibidos", () => {
    const email = buildEventOnlineReminderEmail({
      toEmail: "yo@correo.cl",
      userName: "Jorge",
      eventTitle: "Círculo online",
      startsAt: new Date("2026-11-01T22:00:00Z"),
      entryLinks: entryLinksFor(attendees, "yo@correo.cl"),
      branding,
    });
    expect(email.subject).toBe("Hoy: Círculo online");
    expect(email.html).toContain("/eventos/entrar/tok1");
    expect(email.html).toContain("/eventos/entrar/tok3");
    expect(email.text).toContain("Entrada 2 · Ana");
  });

  it("sin nombre saluda genérico", () => {
    const email = buildEventOnlineReminderEmail({
      toEmail: "a@b.cl",
      userName: null,
      eventTitle: "E",
      startsAt: new Date(),
      entryLinks: [],
      branding,
    });
    expect(email.html).toContain("<p>Hola,</p>");
  });
});
