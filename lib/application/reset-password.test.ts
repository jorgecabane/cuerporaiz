import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetPassword } from "./reset-password";
import type { PasswordResetToken } from "@/lib/domain/auth-token";

vi.mock("@/lib/adapters/db/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/adapters/db/prisma";

// --- Factory helpers ---

function makePasswordResetToken(overrides: Partial<PasswordResetToken> = {}): PasswordResetToken {
  return {
    id: "token-1",
    userId: "user-1",
    token: "valid-token-abc",
    expiresAt: new Date(Date.now() + 3600_000), // 1 hour from now
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// --- Mock repos ---

function makeTokenRepo() {
  return {
    createPasswordResetToken: vi.fn(),
    findPasswordResetByToken: vi.fn(),
    markPasswordResetUsed: vi.fn(),
    invalidatePasswordResetTokens: vi.fn(),
    createEmailVerificationToken: vi.fn(),
    findEmailVerificationByToken: vi.fn(),
    markEmailVerificationUsed: vi.fn(),
    invalidateEmailVerificationTokens: vi.fn(),
  };
}

function makeHashPassword() {
  return vi.fn().mockResolvedValue("hashed-new-password");
}

// --- Tests ---

describe("resetPassword", () => {
  let tokenRepo: ReturnType<typeof makeTokenRepo>;
  let hashPassword: ReturnType<typeof makeHashPassword>;

  beforeEach(() => {
    tokenRepo = makeTokenRepo();
    hashPassword = makeHashPassword();
    vi.clearAllMocks();
  });

  it("resetea contraseña con token válido y retorna PASSWORD_RESET", async () => {
    const resetToken = makePasswordResetToken();
    tokenRepo.findPasswordResetByToken.mockResolvedValue(resetToken);
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    tokenRepo.markPasswordResetUsed.mockResolvedValue(undefined);

    const result = await resetPassword("valid-token-abc", "new-password-123", {
      tokenRepo,
      hashPassword,
    });

    expect(result.success).toBe(true);
    expect(result.code).toBe("PASSWORD_RESET");
    expect(hashPassword).toHaveBeenCalledWith("new-password-123");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: resetToken.userId },
      data: { passwordHash: "hashed-new-password", tokenVersion: { increment: 1 } },
    });
    expect(tokenRepo.markPasswordResetUsed).toHaveBeenCalledWith(resetToken.id);
  });

  it("retorna INVALID_TOKEN cuando el token no existe", async () => {
    tokenRepo.findPasswordResetByToken.mockResolvedValue(null);

    const result = await resetPassword("nonexistent-token", "new-password", {
      tokenRepo,
      hashPassword,
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_TOKEN");
    expect(hashPassword).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("retorna EXPIRED_TOKEN cuando el token está vencido", async () => {
    const expiredToken = makePasswordResetToken({
      expiresAt: new Date(Date.now() - 3600_000), // 1 hour ago
    });
    tokenRepo.findPasswordResetByToken.mockResolvedValue(expiredToken);

    const result = await resetPassword("expired-token", "new-password", {
      tokenRepo,
      hashPassword,
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("EXPIRED_TOKEN");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("retorna INVALID_TOKEN cuando el token ya fue usado", async () => {
    const usedToken = makePasswordResetToken({
      usedAt: new Date(Date.now() - 1000),
    });
    tokenRepo.findPasswordResetByToken.mockResolvedValue(usedToken);

    const result = await resetPassword("used-token", "new-password", {
      tokenRepo,
      hashPassword,
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_TOKEN");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
