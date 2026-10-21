import { describe, it, expect } from "vitest";
import { groupReminderRecipients } from "./send-event-online-reminders";

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
