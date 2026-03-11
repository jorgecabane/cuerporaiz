import { describe, it, expect } from "vitest";
import {
  reserveClassBodySchema,
  cancelReservationBodySchema,
} from "@/lib/dto/reservation-dto";
import { RESERVATION_STATUS_LABELS } from "@/lib/domain/reservation";

describe("reservation-dto", () => {
  describe("reserveClassBodySchema", () => {
    it("acepta body válido con liveClassId", () => {
      const result = reserveClassBodySchema.safeParse({ liveClassId: "clxxx123" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.liveClassId).toBe("clxxx123");
    });

    it("rechaza liveClassId vacío", () => {
      const result = reserveClassBodySchema.safeParse({ liveClassId: "" });
      expect(result.success).toBe(false);
    });

    it("rechaza sin liveClassId", () => {
      const result = reserveClassBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("cancelReservationBodySchema", () => {
    it("acepta body válido con reservationId", () => {
      const result = cancelReservationBodySchema.safeParse({ reservationId: "resxxx456" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.reservationId).toBe("resxxx456");
    });

    it("rechaza reservationId vacío", () => {
      const result = cancelReservationBodySchema.safeParse({ reservationId: "" });
      expect(result.success).toBe(false);
    });
  });
});

describe("RESERVATION_STATUS_LABELS", () => {
  it("tiene etiquetas para todos los estados", () => {
    expect(RESERVATION_STATUS_LABELS.CONFIRMED).toBe("Confirmada");
    expect(RESERVATION_STATUS_LABELS.CANCELLED).toBe("Cancelada");
    expect(RESERVATION_STATUS_LABELS.ATTENDED).toBe("Asistió");
    expect(RESERVATION_STATUS_LABELS.NO_SHOW).toBe("No-show");
  });
});
