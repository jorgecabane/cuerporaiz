import { describe, it, expect } from "vitest";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} from "./auth-token-dto";

describe("forgotPasswordSchema", () => {
  it("acepta datos válidos", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "a@b.com", centerId: "center-1" }).success,
    ).toBe(true);
  });
  it("rechaza email inválido", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "invalid", centerId: "c" }).success,
    ).toBe(false);
  });
  it("rechaza sin centerId", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("acepta datos válidos", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "abc123", newPassword: "12345678" }).success,
    ).toBe(true);
  });
  it("rechaza password corta", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "abc", newPassword: "123" }).success,
    ).toBe(false);
  });
  it("rechaza sin token", () => {
    expect(resetPasswordSchema.safeParse({ newPassword: "12345678" }).success).toBe(false);
  });
});

describe("resendVerificationSchema", () => {
  it("acepta sin body (usa sesión)", () => {
    expect(resendVerificationSchema.safeParse({}).success).toBe(true);
  });
});
