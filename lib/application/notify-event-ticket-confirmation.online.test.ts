import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyEventTicketConfirmation } from "./notify-event-ticket-confirmation";

const mocks = vi.hoisted(() => ({
  eventRepository: { findById: vi.fn() },
  userRepository: { findById: vi.fn() },
  eventTicketRepository: { findByEventAndUser: vi.fn(), countPaidByEventId: vi.fn() },
  ensureEventAttendees: vi.fn(),
  sendEmailSafe: vi.fn(),
}));

vi.mock("@/lib/adapters/db", () => ({
  eventRepository: mocks.eventRepository,
  userRepository: mocks.userRepository,
  eventTicketRepository: mocks.eventTicketRepository,
}));
vi.mock("./ensure-event-attendees", () => ({ ensureEventAttendees: mocks.ensureEventAttendees }));
vi.mock("./send-email", () => ({ sendEmailSafe: mocks.sendEmailSafe }));
vi.mock("@/lib/utils/run-after-response", () => ({ runInBackground: (fn: () => Promise<void>) => fn() }));
vi.mock("@/lib/email/branding", async () => {
  const actual = await vi.importActual<typeof import("@/lib/email/branding")>("@/lib/email/branding");
  return { getEmailBranding: async () => actual.defaultBranding("Centro") };
});

const attendee = (seat: number, email: string | null) => ({
  id: `a${seat}`, ticketId: "t1", seat, token: `tok${seat}`, name: email ? "Ana" : null, email,
  firstEnteredAt: null, lastEnteredAt: null, revokedAt: null,
});

const INPUT = { eventId: "e1", userId: "u1", centerId: "c1", amountCents: 0, currency: "CLP", quantity: 2, notifyAdmin: false };
const sentTo = () => mocks.sendEmailSafe.mock.calls.map(([email]) => email.to[0]);

describe("notifyEventTicketConfirmation — evento online", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventRepository.findById.mockResolvedValue({
      id: "e1", title: "Círculo", startsAt: new Date(), endsAt: new Date(), location: null,
      isOnline: true, meetingUrl: "https://zoom.us/j/1", maxCapacity: null,
    });
    mocks.userRepository.findById.mockResolvedValue({ id: "u1", email: "yo@correo.cl", name: "Jorge" });
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue({ id: "t1", quantity: 2 });
    mocks.ensureEventAttendees.mockResolvedValue([attendee(1, null), attendee(2, "ana@correo.cl")]);
  });

  it("compra: confirmación con los links + correo directo al asistente con correo", async () => {
    await notifyEventTicketConfirmation(INPUT);
    expect(mocks.ensureEventAttendees).toHaveBeenCalledWith({ id: "t1", quantity: 2 }, expect.objectContaining({ isOnline: true }));
    expect(sentTo()).toEqual(["yo@correo.cl", "ana@correo.cl"]);
    expect(mocks.sendEmailSafe.mock.calls[0][0].html).toContain("/eventos/entrar/tok2");
  });

  it("re-compra: confirmación con todos los links, sin reenviar a asistentes", async () => {
    await notifyEventTicketConfirmation({ ...INPUT, kind: "addition", addedQuantity: 1 });
    expect(sentTo()).toEqual(["yo@correo.cl"]);
    expect(mocks.sendEmailSafe.mock.calls[0][0].html).toContain("/eventos/entrar/tok1");
  });

  it("si falla crear cupos, igual manda la confirmación (sin links)", async () => {
    mocks.ensureEventAttendees.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await notifyEventTicketConfirmation(INPUT);
    expect(sentTo()).toEqual(["yo@correo.cl"]);
    expect(mocks.sendEmailSafe.mock.calls[0][0].html).not.toContain("Tus entradas");
  });

  it("sin ubicación, la confirmación dice Online (no la dirección del centro)", async () => {
    await notifyEventTicketConfirmation(INPUT);
    expect(mocks.sendEmailSafe.mock.calls[0][0].text).toContain("Lugar: Online");
  });

  it("compra guest gratis: no manda correos directos a asistentes (anti-spam)", async () => {
    mocks.eventTicketRepository.findByEventAndUser.mockResolvedValue({ id: "t1", quantity: 2, claimToken: "guest", amountCents: 0 });
    await notifyEventTicketConfirmation(INPUT);
    expect(sentTo()).toEqual(["yo@correo.cl"]);
  });

  it("deduplica correos y manda como máximo 10 directos", async () => {
    const many = [attendee(1, null), attendee(2, "ana@correo.cl"), attendee(3, "ana@correo.cl")];
    for (let i = 4; i <= 15; i++) many.push(attendee(i, `p${i}@correo.cl`));
    mocks.ensureEventAttendees.mockResolvedValue(many);
    await notifyEventTicketConfirmation(INPUT);
    const direct = sentTo().slice(1);
    expect(direct).toHaveLength(10);
    expect(new Set(direct).size).toBe(10);
    expect(direct[0]).toBe("ana@correo.cl");
  });

  it("evento presencial: no toca cupos", async () => {
    mocks.eventRepository.findById.mockResolvedValue({
      id: "e1", title: "Retiro", startsAt: new Date(), endsAt: new Date(), location: "Sala",
      isOnline: false, meetingUrl: null, maxCapacity: null,
    });
    await notifyEventTicketConfirmation(INPUT);
    expect(mocks.ensureEventAttendees).not.toHaveBeenCalled();
    expect(sentTo()).toEqual(["yo@correo.cl"]);
  });
});
