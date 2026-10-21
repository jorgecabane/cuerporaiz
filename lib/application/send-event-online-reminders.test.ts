import { describe, it, expect, vi } from "vitest";
import { groupReminderRecipients, sendEventOnlineReminders } from "./send-event-online-reminders";

const mocks = vi.hoisted(() => ({
  eventFindMany: vi.fn(),
  attendeeFindMany: vi.fn(),
  ensureSeatsForEvent: vi.fn(),
}));
vi.mock("@/lib/adapters/db/prisma", () => ({
  prisma: { event: { findMany: mocks.eventFindMany }, eventAttendee: { findMany: mocks.attendeeFindMany } },
}));
vi.mock("./ensure-event-attendees", () => ({ ensureSeatsForEvent: mocks.ensureSeatsForEvent }));
vi.mock("./send-email", () => ({ sendEmailSafe: vi.fn() }));
vi.mock("./check-email-preference", () => ({ shouldSendEmail: vi.fn() }));
vi.mock("@/lib/email/branding", () => ({ getEmailBranding: vi.fn() }));

const buyer = { id: "u1", email: "yo@correo.cl", name: "Jorge" };
const row = (seat: number, email: string | null, eventId = "e1") => ({
  id: `a${seat}`,
  ticketId: "t1",
  seat,
  token: `tok${seat}`,
  name: email ? "Ana" : null,
  email,
  firstEnteredAt: null,
  lastEnteredAt: null,
  revokedAt: null,
  buyer,
  eventId,
});

describe("groupReminderRecipients", () => {
  it("cupos sin correo (o con el del comprador) → un solo correo al comprador con todos", () => {
    const groups = groupReminderRecipients([row(1, null), row(2, null), row(3, "yo@correo.cl")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ toEmail: "yo@correo.cl", isBuyer: true, userId: "u1", userName: "Jorge" });
    expect(groups[0].attendees.map((a) => a.seat)).toEqual([1, 2, 3]);
  });

  it("asistente con correo propio → su propio correo con sólo su link", () => {
    const groups = groupReminderRecipients([row(1, null), row(2, "ana@correo.cl")]);
    expect(groups).toHaveLength(2);
    const ana = groups.find((g) => g.toEmail === "ana@correo.cl")!;
    expect(ana).toMatchObject({ isBuyer: false, userName: "Ana" });
    expect(ana.attendees.map((a) => a.seat)).toEqual([2]);
  });

  it("mismo comprador en dos eventos → un correo por evento", () => {
    expect(groupReminderRecipients([row(1, null, "e1"), row(1, null, "e2")])).toHaveLength(2);
  });
});

describe("sendEventOnlineReminders", () => {
  it("antes de buscar destinatarios, crea cupos de compras previas a pasar a online", async () => {
    mocks.eventFindMany.mockResolvedValue([{ id: "e1" }, { id: "e2" }]);
    mocks.attendeeFindMany.mockResolvedValue([]);
    expect(await sendEventOnlineReminders(new Date("2026-11-01T20:00:00Z"))).toEqual({ sent: 0 });
    expect(mocks.ensureSeatsForEvent.mock.calls).toEqual([["e1"], ["e2"]]);
    expect(mocks.ensureSeatsForEvent.mock.invocationCallOrder[1]).toBeLessThan(
      mocks.attendeeFindMany.mock.invocationCallOrder[0]
    );
  });
});
