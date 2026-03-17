import { describe, it, expect } from "vitest";
import { isRole, isAdminRole, ROLE_LABELS, DEFAULT_SIGNUP_ROLE } from "./role";

describe("role", () => {
  it("isRole valida roles conocidos", () => {
    expect(isRole("STUDENT")).toBe(true);
    expect(isRole("INSTRUCTOR")).toBe(true);
    expect(isRole("ADMINISTRATOR")).toBe(true);
    expect(isRole("ADMIN")).toBe(false);
  });

  it("isAdminRole", () => {
    expect(isAdminRole("ADMINISTRATOR")).toBe(true);
    expect(isAdminRole("STUDENT")).toBe(false);
  });

  it("ROLE_LABELS cubre todos los roles", () => {
    expect(ROLE_LABELS.STUDENT).toBeTruthy();
    expect(ROLE_LABELS.INSTRUCTOR).toBeTruthy();
    expect(ROLE_LABELS.ADMINISTRATOR).toBeTruthy();
  });

  it("DEFAULT_SIGNUP_ROLE es STUDENT", () => {
    expect(DEFAULT_SIGNUP_ROLE).toBe("STUDENT");
  });
});

