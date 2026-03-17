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

  it("signupBodySchema default role es opcional pero válido si viene", () => {
    const parsed = signupBodySchema.parse({
      email: "a@b.com",
      password: "12345678",
      centerId: "center",
      role: "STUDENT",
    });
    expect(parsed.role).toBe("STUDENT");
  });
});

