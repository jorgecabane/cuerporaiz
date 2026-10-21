import { describe, it, expect } from "vitest";
import { eventAttendeesSchema } from "./event-attendee-dto";

describe("eventAttendeesSchema", () => {
  it("undefined → undefined (compra sin asistentes)", () => {
    expect(eventAttendeesSchema.parse(undefined)).toBeUndefined();
  });

  it("normaliza vacíos a null y el correo a minúsculas", () => {
    expect(
      eventAttendeesSchema.parse([
        { name: "  Ana  ", email: " Ana@Correo.CL " },
        { name: "", email: "" },
        {},
      ])
    ).toEqual([
      { name: "Ana", email: "ana@correo.cl" },
      { name: null, email: null },
      { name: null, email: null },
    ]);
  });

  it("acepta null (campos sin tocar en el formulario)", () => {
    expect(eventAttendeesSchema.parse([{ name: "Ana", email: null }, { name: null, email: null }])).toEqual([
      { name: "Ana", email: null },
      { name: null, email: null },
    ]);
  });

  it("correo inválido → error", () => {
    expect(eventAttendeesSchema.safeParse([{ email: "no-es-correo" }]).success).toBe(false);
  });

  it("máximo 199 filas (cupos 2…200)", () => {
    expect(eventAttendeesSchema.safeParse(Array(200).fill({})).success).toBe(false);
  });
});
