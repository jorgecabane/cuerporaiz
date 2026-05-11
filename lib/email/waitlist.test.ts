import { describe, it, expect } from "vitest";
import {
  buildSpotFreedEmail,
  buildWaitlistClassCancelledEmail,
  type SpotFreedData,
  type WaitlistClassCancelledData,
} from "./waitlist";
import type { EmailBranding } from "./branding";

const branding: EmailBranding = {
  centerId: "ctr_1",
  centerName: "Cuerpo Raíz",
  timezone: "America/Santiago",
  logoUrl: "https://example.com/logo.png",
  colorPrimary: "#2D3B2A",
  colorSecondary: "#B85C38",
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  whatsappUrl: null,
  instagramUrl: null,
};

describe("buildSpotFreedEmail (clase)", () => {
  const baseData: SpotFreedData = {
    toEmail: "estudiante@example.com",
    userName: "Carla",
    itemKind: "class",
    itemName: "Vinyasa Flow",
    startAt: "2026-05-15T19:00:00Z",
    endAt: "2026-05-15T20:00:00Z",
    location: "Av. O'Higgins 555, Pucón",
    bookUrl: "https://app.example.com/panel/reservas?openClass=lc_1&fromWaitlist=1",
    ctaLabel: "Reservar ahora",
    branding,
  };

  it("subject menciona la clase", () => {
    const dto = buildSpotFreedEmail(baseData);
    expect(dto.subject).toContain("Vinyasa Flow");
    expect(dto.subject.toLowerCase()).toContain("cupo");
  });

  it("html incluye el copy de clase", () => {
    const dto = buildSpotFreedEmail(baseData);
    expect(dto.html).toContain("la clase");
    expect(dto.html).toContain("Vinyasa Flow");
    expect(dto.html).toContain("Carla");
  });

  it("html usa el ctaLabel y bookUrl", () => {
    const dto = buildSpotFreedEmail(baseData);
    expect(dto.html).toContain("Reservar ahora");
    expect(dto.html).toContain(baseData.bookUrl);
  });

  it("envía al toEmail", () => {
    const dto = buildSpotFreedEmail(baseData);
    expect(dto.to).toEqual(["estudiante@example.com"]);
  });
});

describe("buildSpotFreedEmail (evento)", () => {
  const baseData: SpotFreedData = {
    toEmail: "user@example.com",
    userName: "Tomás",
    itemKind: "event",
    itemName: "Retiro de invierno",
    startAt: "2026-07-10T15:00:00Z",
    location: "Centro Cuerpo Raíz",
    bookUrl: "https://app.example.com/panel/eventos/ev_42",
    ctaLabel: "Ir al pago",
    branding,
  };

  it("subject menciona el evento", () => {
    const dto = buildSpotFreedEmail(baseData);
    expect(dto.subject).toContain("Retiro de invierno");
  });

  it("html usa el copy de evento, no de clase", () => {
    const dto = buildSpotFreedEmail(baseData);
    expect(dto.html).toContain("el evento");
    expect(dto.html).not.toContain(">la clase<");
  });

  it("html incluye CTA personalizado de pago", () => {
    const dto = buildSpotFreedEmail(baseData);
    expect(dto.html).toContain("Ir al pago");
  });

  it("acepta endAt opcional sin romperse", () => {
    expect(() => buildSpotFreedEmail(baseData)).not.toThrow();
  });
});

describe("buildSpotFreedEmail saneamiento", () => {
  it("escapa HTML potencialmente malicioso en el nombre del item", () => {
    const dto = buildSpotFreedEmail({
      toEmail: "x@example.com",
      itemKind: "class",
      itemName: "<script>alert(1)</script>",
      startAt: "2026-05-15T19:00:00Z",
      endAt: "2026-05-15T20:00:00Z",
      location: "Sala 1",
      bookUrl: "https://app.example.com/x",
      ctaLabel: "Reservar",
      branding,
    });
    expect(dto.html).not.toContain("<script>alert");
  });
});

describe("buildWaitlistClassCancelledEmail", () => {
  const baseData: WaitlistClassCancelledData = {
    toEmail: "estudiante@example.com",
    userName: "Sofía",
    className: "Hatha Suave",
    startAt: "2026-05-20T18:00:00Z",
    location: "Sala 2",
    branding,
  };

  it("subject menciona la cancelación", () => {
    const dto = buildWaitlistClassCancelledEmail(baseData);
    expect(dto.subject.toLowerCase()).toContain("cancelad");
    expect(dto.subject).toContain("Hatha Suave");
  });

  it("html aclara que la clase fue cancelada", () => {
    const dto = buildWaitlistClassCancelledEmail(baseData);
    expect(dto.html).toContain("Hatha Suave");
    expect(dto.html.toLowerCase()).toContain("cancelad");
    expect(dto.html.toLowerCase()).toContain("lista de espera");
  });

  it("envía al toEmail correcto", () => {
    const dto = buildWaitlistClassCancelledEmail(baseData);
    expect(dto.to).toEqual(["estudiante@example.com"]);
  });
});
