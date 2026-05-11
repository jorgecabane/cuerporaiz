import { describe, it, expect } from "vitest";
import {
  WAITLIST_STATUSES,
  WAITLIST_STATUS_LABELS,
  WAITLIST_NOTIFY_THROTTLE_MIN,
  EVENT_HOLD_MINUTES,
  isActiveWaitlistStatus,
  isTerminalWaitlistStatus,
  canPromoteWaitlistEntry,
  validateWaitlistInvariant,
  shouldThrottleNotification,
  type WaitlistStatus,
} from "./waitlist";

describe("waitlist constants", () => {
  it("WAITLIST_STATUSES cubre los 6 estados del enum", () => {
    expect(WAITLIST_STATUSES).toEqual([
      "QUEUED",
      "NOTIFIED",
      "HELD",
      "PROMOTED",
      "EXPIRED",
      "CANCELLED",
    ]);
  });

  it("WAITLIST_STATUS_LABELS cubre todos los estados con copy en español", () => {
    for (const status of WAITLIST_STATUSES) {
      expect(WAITLIST_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("WAITLIST_NOTIFY_THROTTLE_MIN es 10 minutos", () => {
    expect(WAITLIST_NOTIFY_THROTTLE_MIN).toBe(10);
  });

  it("EVENT_HOLD_MINUTES es 15 minutos", () => {
    expect(EVENT_HOLD_MINUTES).toBe(15);
  });
});

describe("isActiveWaitlistStatus", () => {
  it("QUEUED, NOTIFIED y HELD están activos", () => {
    expect(isActiveWaitlistStatus("QUEUED")).toBe(true);
    expect(isActiveWaitlistStatus("NOTIFIED")).toBe(true);
    expect(isActiveWaitlistStatus("HELD")).toBe(true);
  });

  it("PROMOTED, EXPIRED y CANCELLED no están activos", () => {
    expect(isActiveWaitlistStatus("PROMOTED")).toBe(false);
    expect(isActiveWaitlistStatus("EXPIRED")).toBe(false);
    expect(isActiveWaitlistStatus("CANCELLED")).toBe(false);
  });
});

describe("isTerminalWaitlistStatus", () => {
  it("PROMOTED, EXPIRED y CANCELLED son terminales", () => {
    expect(isTerminalWaitlistStatus("PROMOTED")).toBe(true);
    expect(isTerminalWaitlistStatus("EXPIRED")).toBe(true);
    expect(isTerminalWaitlistStatus("CANCELLED")).toBe(true);
  });

  it("QUEUED, NOTIFIED y HELD no son terminales", () => {
    expect(isTerminalWaitlistStatus("QUEUED")).toBe(false);
    expect(isTerminalWaitlistStatus("NOTIFIED")).toBe(false);
    expect(isTerminalWaitlistStatus("HELD")).toBe(false);
  });
});

describe("canPromoteWaitlistEntry", () => {
  it("permite promover desde QUEUED", () => {
    expect(canPromoteWaitlistEntry("QUEUED")).toBe(true);
  });

  it("permite promover desde NOTIFIED", () => {
    expect(canPromoteWaitlistEntry("NOTIFIED")).toBe(true);
  });

  it("no permite promover desde estados terminales", () => {
    expect(canPromoteWaitlistEntry("PROMOTED")).toBe(false);
    expect(canPromoteWaitlistEntry("EXPIRED")).toBe(false);
    expect(canPromoteWaitlistEntry("CANCELLED")).toBe(false);
  });

  it("no permite re-promover desde HELD (ya tiene hold activo)", () => {
    expect(canPromoteWaitlistEntry("HELD")).toBe(false);
  });
});

describe("validateWaitlistInvariant", () => {
  it("acepta cuando solo liveClassId está seteado", () => {
    expect(() =>
      validateWaitlistInvariant({ liveClassId: "lc_1", eventId: null })
    ).not.toThrow();
  });

  it("acepta cuando solo eventId está seteado", () => {
    expect(() =>
      validateWaitlistInvariant({ liveClassId: null, eventId: "ev_1" })
    ).not.toThrow();
  });

  it("rechaza cuando ambos están null", () => {
    expect(() =>
      validateWaitlistInvariant({ liveClassId: null, eventId: null })
    ).toThrow(/exactamente uno/i);
  });

  it("rechaza cuando ambos están seteados", () => {
    expect(() =>
      validateWaitlistInvariant({ liveClassId: "lc_1", eventId: "ev_1" })
    ).toThrow(/exactamente uno/i);
  });
});

describe("shouldThrottleNotification", () => {
  const now = new Date("2026-05-10T12:00:00Z");

  it("no throttea si nunca fue notificado (notifiedAt = null)", () => {
    expect(shouldThrottleNotification(null, now)).toBe(false);
  });

  it("throttea si fue notificado hace menos de 10 min", () => {
    const recent = new Date("2026-05-10T11:55:00Z"); // 5 min atrás
    expect(shouldThrottleNotification(recent, now)).toBe(true);
  });

  it("no throttea si fue notificado hace más de 10 min", () => {
    const old = new Date("2026-05-10T11:45:00Z"); // 15 min atrás
    expect(shouldThrottleNotification(old, now)).toBe(false);
  });

  it("no throttea exactamente al borde de 10 min", () => {
    const exactly = new Date("2026-05-10T11:50:00Z"); // 10 min atrás exacto
    expect(shouldThrottleNotification(exactly, now)).toBe(false);
  });
});

describe("type exports", () => {
  it("WaitlistStatus type alias está disponible", () => {
    const s: WaitlistStatus = "QUEUED";
    expect(WAITLIST_STATUSES).toContain(s);
  });
});
