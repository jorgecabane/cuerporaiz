import { describe, it, expect } from "vitest";
import { buildGoogleCalendarUrl, getAddToCalendarInstruction } from "@/lib/email/calendar";

describe("calendar", () => {
  describe("buildGoogleCalendarUrl", () => {
    it("genera URL con action=TEMPLATE, text y dates", () => {
      const url = buildGoogleCalendarUrl({
        title: "Vinyasa Flow",
        start: "2025-03-15T10:00:00",
        end: "2025-03-15T11:00:00",
      });
      expect(url).toContain("calendar.google.com");
      expect(url).toContain("action=TEMPLATE");
      expect(url).toContain("text=Vinyasa+Flow");
      expect(url).toContain("dates=");
    });

    it("incluye details y location cuando se pasan", () => {
      const url = buildGoogleCalendarUrl({
        title: "Clase",
        start: "2025-03-15T10:00:00",
        end: "2025-03-15T11:00:00",
        details: "Ver reserva",
        location: "Vitacura",
      });
      expect(url).toContain("details=");
      expect(url).toContain("location=Vitacura");
    });

    it("incluye ctz cuando se pasa timeZone", () => {
      const url = buildGoogleCalendarUrl({
        title: "Clase",
        start: "2025-03-15T10:00:00",
        end: "2025-03-15T11:00:00",
        timeZone: "America/Santiago",
      });
      expect(url).toContain("ctz=America%2FSantiago");
    });
  });

  describe("getAddToCalendarInstruction", () => {
    it("devuelve texto con la URL", () => {
      const text = getAddToCalendarInstruction("https://calendar.google.com/...");
      expect(text).toBe("Añadir al calendario: https://calendar.google.com/...");
    });
  });
});
