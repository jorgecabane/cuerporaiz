import { describe, it, expect } from "vitest";
import {
  joinWaitlistBodySchema,
  promoteWaitlistBodySchema,
  adminListWaitlistQuerySchema,
} from "./waitlist-dto";

describe("joinWaitlistBodySchema", () => {
  it("acepta kind=class con liveClassId", () => {
    const r = joinWaitlistBodySchema.safeParse({ kind: "class", itemId: "lc_1" });
    expect(r.success).toBe(true);
  });

  it("acepta kind=event con itemId", () => {
    const r = joinWaitlistBodySchema.safeParse({ kind: "event", itemId: "ev_1" });
    expect(r.success).toBe(true);
  });

  it("rechaza kind desconocido", () => {
    const r = joinWaitlistBodySchema.safeParse({ kind: "other", itemId: "x" });
    expect(r.success).toBe(false);
  });

  it("rechaza itemId vacío", () => {
    const r = joinWaitlistBodySchema.safeParse({ kind: "class", itemId: "" });
    expect(r.success).toBe(false);
  });

  it("rechaza body sin kind", () => {
    const r = joinWaitlistBodySchema.safeParse({ itemId: "lc_1" });
    expect(r.success).toBe(false);
  });
});

describe("promoteWaitlistBodySchema", () => {
  it("body opcional vacío es aceptado (entry id viene en URL)", () => {
    const r = promoteWaitlistBodySchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("acepta body indefinido", () => {
    const r = promoteWaitlistBodySchema.safeParse(undefined);
    expect(r.success).toBe(true);
  });
});

describe("adminListWaitlistQuerySchema", () => {
  it("acepta liveClassId solo", () => {
    const r = adminListWaitlistQuerySchema.safeParse({ liveClassId: "lc_1" });
    expect(r.success).toBe(true);
  });

  it("acepta eventId solo", () => {
    const r = adminListWaitlistQuerySchema.safeParse({ eventId: "ev_1" });
    expect(r.success).toBe(true);
  });

  it("rechaza si no se especifica ninguno", () => {
    const r = adminListWaitlistQuerySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rechaza si se especifican ambos", () => {
    const r = adminListWaitlistQuerySchema.safeParse({
      liveClassId: "lc_1",
      eventId: "ev_1",
    });
    expect(r.success).toBe(false);
  });
});
