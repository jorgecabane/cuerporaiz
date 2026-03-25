import { describe, it, expect } from "vitest";
import {
  isRole, isAdminRole, isStudentRole, isInstructorRole, isStaffRole,
  ROLE_LABELS, ROLES, DEFAULT_SIGNUP_ROLE,
} from "./role";

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

  it("isStudentRole", () => {
    expect(isStudentRole("STUDENT")).toBe(true);
    expect(isStudentRole("ADMINISTRATOR")).toBe(false);
  });

  it("isInstructorRole", () => {
    expect(isInstructorRole("INSTRUCTOR")).toBe(true);
    expect(isInstructorRole("STUDENT")).toBe(false);
  });

  it("isStaffRole returns true for admin and instructor", () => {
    expect(isStaffRole("ADMINISTRATOR")).toBe(true);
    expect(isStaffRole("INSTRUCTOR")).toBe(true);
    expect(isStaffRole("STUDENT")).toBe(false);
  });

  it("ROLE_LABELS cubre todos los roles", () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });

  it("DEFAULT_SIGNUP_ROLE es STUDENT", () => {
    expect(DEFAULT_SIGNUP_ROLE).toBe("STUDENT");
  });
});

