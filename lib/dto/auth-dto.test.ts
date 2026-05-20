import { describe, it, expect } from "vitest";
import { loginBodySchema, signupBodySchema } from "./auth-dto";

describe("auth-dto schemas", () => {
  it("loginBodySchema valida inputs correctos", () => {
    const parsed = loginBodySchema.parse({
      email: "a@b.com",
      password: "x",
      centerId: "center",
    });
    expect(parsed.email).toBe("a@b.com");
  });

  it("signupBodySchema parsea inputs válidos sin campo role", () => {
    const parsed = signupBodySchema.parse({
      email: "a@b.com",
      password: "12345678",
      centerId: "center",
    });
    expect(parsed.email).toBe("a@b.com");
    expect("role" in parsed).toBe(false);
  });

  it("signupBodySchema descarta role aunque venga en el body (anti privilege escalation)", () => {
    const parsed = signupBodySchema.parse({
      email: "a@b.com",
      password: "12345678",
      centerId: "center",
      role: "ADMINISTRATOR",
    } as unknown as { email: string; password: string; centerId: string });
    expect("role" in parsed).toBe(false);
  });
});

