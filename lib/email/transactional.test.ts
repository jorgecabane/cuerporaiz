import { describe, it, expect } from "vitest";
import { buildReservationConfirmationEmail } from "./transactional";
import type { EmailBranding } from "./branding";

const branding: EmailBranding = {
  centerId: "c-1",
  centerName: "Cuerpo Raíz Test",
  timezone: "America/Santiago",
  logoUrl: null,
  colorPrimary: "#2D3B2A",
  colorSecondary: "#B85C38",
  contactEmail: "hola@test.cl",
  contactPhone: null,
  contactAddress: "Av. Test 123",
  whatsappUrl: null,
  instagramUrl: null,
};

const base = {
  toEmail: "silvana@test.cl",
  userName: "Silvana",
  className: "Vinyasa Yoga",
  startAt: "2026-05-28T22:00:00Z",
  endAt: "2026-05-28T23:00:00Z",
  location: "Vitacura, Santiago",
  myReservationsUrl: "https://cuerporaiz.cl/panel/reservas",
  branding,
};

describe("buildReservationConfirmationEmail — variante normal (default)", () => {
  it("usa asunto 'Reserva confirmada' cuando isTrial=false", () => {
    const dto = buildReservationConfirmationEmail({ ...base, isTrial: false });
    expect(dto.subject).toBe("Reserva confirmada: Vinyasa Yoga");
    expect(dto.html).toContain("Tu reserva quedó confirmada.");
    expect(dto.html).not.toContain("clase de prueba");
    expect(dto.text).toContain("Tu reserva quedó confirmada.");
  });

  it("usa asunto 'Reserva confirmada' cuando isTrial no se pasa (backwards-compat)", () => {
    const dto = buildReservationConfirmationEmail(base);
    expect(dto.subject).toBe("Reserva confirmada: Vinyasa Yoga");
  });
});

describe("buildReservationConfirmationEmail — variante trial (isTrial=true)", () => {
  it("cambia asunto a 'Clase de prueba confirmada'", () => {
    const dto = buildReservationConfirmationEmail({ ...base, isTrial: true });
    expect(dto.subject).toBe("Clase de prueba confirmada: Vinyasa Yoga");
  });

  it("incluye copy de bienvenida y mención a planes en HTML y text", () => {
    const dto = buildReservationConfirmationEmail({ ...base, isTrial: true });
    expect(dto.html).toContain("Tu clase de prueba quedó confirmada");
    expect(dto.html).toContain("Te esperamos");
    expect(dto.html).toContain("planes disponibles en nuestra web");
    expect(dto.text).toContain("Tu clase de prueba quedó confirmada");
    expect(dto.text).toContain("planes disponibles");
  });

  it("preserva info de clase y botón calendar", () => {
    const dto = buildReservationConfirmationEmail({ ...base, isTrial: true });
    expect(dto.html).toContain("Vinyasa Yoga");
    expect(dto.html).toContain("Vitacura, Santiago");
    expect(dto.html).toContain("Añadir a Google Calendar");
  });

  it("respeta es-CL con tú: 'quieres', 'puedes', sin voseo", () => {
    const dto = buildReservationConfirmationEmail({ ...base, isTrial: true });
    expect(dto.html).toMatch(/quieres seguir/);
    expect(dto.html).toMatch(/puedes ver/);
    expect(dto.html).not.toMatch(/querés|podés|tenés/);
  });
});
