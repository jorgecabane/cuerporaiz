import { describe, it, expect } from "vitest";
import { updateProfileSchema, changePasswordSchema, updateEmailPreferencesSchema } from "./profile-dto";

describe("updateProfileSchema", () => {
  it("accepts valid profile update", () => {
    const result = updateProfileSchema.safeParse({ name: "Jorge", phone: "+56912345678" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateProfileSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts valid password change", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old12345",
      newPassword: "new12345",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old12345",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateEmailPreferencesSchema", () => {
  it("accepts partial boolean updates", () => {
    const result = updateEmailPreferencesSchema.safeParse({ classReminder: false });
    expect(result.success).toBe(true);
  });

  it("rejects non-boolean values", () => {
    const result = updateEmailPreferencesSchema.safeParse({ classReminder: "yes" });
    expect(result.success).toBe(false);
  });
});
