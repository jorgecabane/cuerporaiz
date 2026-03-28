import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestPasswordReset } from "./request-password-reset";
import type { User } from "@/lib/domain";

// --- Factory helpers ---

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "user@example.com",
    name: "Test User",
    lastName: null,
    phone: null,
    rut: null,
    birthday: null,
    sex: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// --- Mock repos ---

function makeDeps() {
  return {
    tokenRepo: {
      createPasswordResetToken: vi.fn(),
      findPasswordResetByToken: vi.fn(),
      markPasswordResetUsed: vi.fn(),
      invalidatePasswordResetTokens: vi.fn(),
      createEmailVerificationToken: vi.fn(),
      findEmailVerificationByToken: vi.fn(),
      markEmailVerificationUsed: vi.fn(),
      invalidateEmailVerificationTokens: vi.fn(),
    },
    userRepo: {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findManyByIds: vi.fn(),
      findByIdWithMemberships: vi.fn(),
      findManyByCenterId: vi.fn(),
      addRole: vi.fn(),
    },
  };
}

// --- Tests ---

describe("requestPasswordReset", () => {
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    deps = makeDeps();
    vi.clearAllMocks();
  });

  it("retorna token cuando el usuario existe", async () => {
    const user = makeUser();
    deps.userRepo.findByEmail.mockResolvedValue(user);
    deps.tokenRepo.invalidatePasswordResetTokens.mockResolvedValue(undefined);
    deps.tokenRepo.createPasswordResetToken.mockResolvedValue({
      id: "token-1",
      userId: user.id,
      token: "abc123",
      expiresAt: new Date(Date.now() + 3600_000),
      usedAt: null,
      createdAt: new Date(),
    });

    const result = await requestPasswordReset("user@example.com", "center-1", deps);

    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.userId).toBe(user.id);
  });

  it("retorna success sin token cuando el usuario no existe (no revela si existe el email)", async () => {
    deps.userRepo.findByEmail.mockResolvedValue(null);

    const result = await requestPasswordReset("unknown@example.com", "center-1", deps);

    expect(result.success).toBe(true);
    expect(result.token).toBeUndefined();
    expect(result.userId).toBeUndefined();
    expect(deps.tokenRepo.createPasswordResetToken).not.toHaveBeenCalled();
  });

  it("invalida tokens anteriores antes de crear el nuevo", async () => {
    const user = makeUser();
    deps.userRepo.findByEmail.mockResolvedValue(user);
    deps.tokenRepo.invalidatePasswordResetTokens.mockResolvedValue(undefined);
    deps.tokenRepo.createPasswordResetToken.mockResolvedValue({
      id: "token-1",
      userId: user.id,
      token: "abc123",
      expiresAt: new Date(Date.now() + 3600_000),
      usedAt: null,
      createdAt: new Date(),
    });

    await requestPasswordReset("user@example.com", "center-1", deps);

    const invalidateOrder = deps.tokenRepo.invalidatePasswordResetTokens.mock.invocationCallOrder[0];
    const createOrder = deps.tokenRepo.createPasswordResetToken.mock.invocationCallOrder[0];

    expect(invalidateOrder).toBeLessThan(createOrder);
    expect(deps.tokenRepo.invalidatePasswordResetTokens).toHaveBeenCalledWith(user.id);
    expect(deps.tokenRepo.createPasswordResetToken).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
      expect.any(Date),
    );
  });
});
