import { describe, it, expect } from "vitest";
import { normalizeEmail, mergeBlogRecipients } from "./newsletter";

describe("normalizeEmail", () => {
  it("recorta y pasa a minúsculas", () => {
    expect(normalizeEmail("  Ana@Correo.CL ")).toBe("ana@correo.cl");
  });
});

describe("mergeBlogRecipients", () => {
  it("une alumnos con blog activo y suscriptores, sin duplicar", () => {
    const result = mergeBlogRecipients(
      [
        { email: "Ana@correo.cl", name: "Ana", blogPublished: null },
        { email: "beto@correo.cl", name: "Beto", blogPublished: false },
        { email: null, name: "Sin mail", blogPublished: true },
        { email: "ana@correo.cl", name: "Ana duplicada", blogPublished: true },
      ],
      ["ANA@correo.cl", "cami@correo.cl", "beto@correo.cl"]
    );
    expect(result).toEqual([
      { email: "ana@correo.cl", name: "Ana", isStudent: true },
      { email: "cami@correo.cl", isStudent: false },
      { email: "beto@correo.cl", isStudent: false },
    ]);
  });
});

import { toSubscribersCsv } from "./newsletter";

describe("toSubscribersCsv", () => {
  it("genera encabezado, estado y neutraliza fórmulas", () => {
    const csv = toSubscribersCsv([
      { email: "ana@correo.cl", subscribedAt: new Date("2026-09-28T12:00:00Z"), unsubscribedAt: null },
      { email: "=HYPERLINK(1)", subscribedAt: new Date("2026-09-01T00:00:00Z"), unsubscribedAt: new Date() },
    ]);
    const lines = csv.replace("﻿", "").trim().split("\n");
    expect(lines[0]).toBe("email,suscrito_desde,estado");
    expect(lines[1]).toBe('"ana@correo.cl","2026-09-28T12:00:00.000Z","suscrito"');
    expect(lines[2]).toContain(`"'=HYPERLINK(1)"`);
    expect(lines[2]).toContain('"baja"');
  });
});
