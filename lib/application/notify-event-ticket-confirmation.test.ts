import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regresión: los callers NO esperan esta promesa (fire-and-forget). Si after()
 * se registra recién después de cargar datos, el request ya respondió y Next
 * lo ignora en silencio → el correo nunca sale. Debe registrarse en el mismo
 * tick de la llamada, y el envío debe quedar dentro de esa promesa.
 */
const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  send: vi.fn(async (dto: { subject: string; to: string[] }) => ({ success: true, id: dto.subject })),
  eventRepository: { findById: vi.fn() },
  eventTicketRepository: { countPaidByEventId: vi.fn(async () => 9) },
  userRepository: { findById: vi.fn() },
  contactEmail: "admin@centro.cl" as string | null,
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/adapters/email", () => ({ resendEmailAdapter: { send: mocks.send } }));
vi.mock("@/lib/adapters/db", () => ({
  eventRepository: mocks.eventRepository,
  eventTicketRepository: mocks.eventTicketRepository,
  userRepository: mocks.userRepository,
}));
vi.mock("@/lib/email/branding", () => ({
  getEmailBranding: vi.fn(async () => ({
    centerId: "c1", centerName: "Cuerpo Raíz", timezone: "America/Santiago", logoUrl: null,
    colorPrimary: "#a35644", colorSecondary: "#b27362", contactEmail: mocks.contactEmail, contactPhone: null,
    contactAddress: "Vitacura", whatsappUrl: null, instagramUrl: null,
  })),
}));

import { notifyEventTicketConfirmation } from "./notify-event-ticket-confirmation";

describe("notifyEventTicketConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventRepository.findById.mockResolvedValue({
      id: "e1", title: "Clase Recuperativa", startsAt: new Date("2026-10-10T21:30:00Z"),
      endsAt: new Date("2026-10-10T22:30:00Z"), location: null,
    });
    mocks.userRepository.findById.mockResolvedValue({ id: "u1", email: "ana@correo.cl", name: "Ana", phone: null });
    mocks.contactEmail = "admin@centro.cl";
  });

  it("registra after() en el mismo tick (antes de cargar datos) y el envío queda dentro", async () => {
    const promise = notifyEventTicketConfirmation({ eventId: "e1", userId: "u1", centerId: "c1", amountCents: 0, currency: "CLP" });

    // Sin await todavía: el request podría responder ahora mismo.
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.after.mock.calls[0][0]).toBeInstanceOf(Promise);

    await mocks.after.mock.calls[0][0];
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: ["ana@correo.cl"] }));
    await promise;
  });

  it("si el evento o el usuario no existen, no envía", async () => {
    mocks.userRepository.findById.mockResolvedValue(null);
    await notifyEventTicketConfirmation({ eventId: "e1", userId: "u1", centerId: "c1", amountCents: 0, currency: "CLP" });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("avisa al admin (email de contacto) con el total de cupos confirmados", async () => {
    await notifyEventTicketConfirmation({ eventId: "e1", userId: "u1", centerId: "c1", amountCents: 0, currency: "CLP", quantity: 2 });
    expect(mocks.send.mock.calls.map(([dto]) => dto)).toEqual([
      expect.objectContaining({ to: ["ana@correo.cl"], subject: "Confirmación: Clase Recuperativa" }),
      expect.objectContaining({ to: ["admin@centro.cl"], subject: "Nueva inscripción: Clase Recuperativa — Ana" }),
    ]);
  });

  it("no avisa al admin si la acción la hizo el admin o si no hay email de contacto", async () => {
    await notifyEventTicketConfirmation({ eventId: "e1", userId: "u1", centerId: "c1", amountCents: 0, currency: "CLP", notifyAdmin: false });
    expect(mocks.send).toHaveBeenCalledTimes(1);

    mocks.send.mockClear();
    mocks.contactEmail = null;
    await notifyEventTicketConfirmation({ eventId: "e1", userId: "u1", centerId: "c1", amountCents: 0, currency: "CLP" });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
