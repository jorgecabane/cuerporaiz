import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyEmail } from "./verify-email";
import type { EmailVerificationToken } from "@/lib/domain/auth-token";

vi.mock("@/lib/adapters/db/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/adapters/db/prisma";

// --- Factory helpers ---

function makeEmailVerificationToken(
  overrides: Partial<EmailVerificationToken> = {},
): EmailVerificationToken {
  return {
    id: "token-1",
    userId: "user-1",
    token: "valid-verify-token",
    expiresAt: new Date(Date.now() + 24 * 3600_000), // 24 hours from now
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// --- Mock repo ---

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

// --- Tests ---

describe("verifyEmail", () => {
  let tokenRepo: ReturnType<typeof makeTokenRepo>;

  beforeEach(() => {
    tokenRepo = makeTokenRepo();
    vi.clearAllMocks();
  });

  it("marca email como verificado con token válido y retorna VERIFIED", async () => {
    const verificationToken = makeEmailVerificationToken();
    tokenRepo.findEmailVerificationByToken.mockResolvedValue(verificationToken);
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    tokenRepo.markEmailVerificationUsed.mockResolvedValue(undefined);

    const result = await verifyEmail("valid-verify-token", tokenRepo);

    expect(result.success).toBe(true);
    expect(result.code).toBe("VERIFIED");
    expect(result.userId).toBe(verificationToken.userId);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: verificationToken.userId },
      data: { emailVerifiedAt: expect.any(Date) },
    });
    expect(tokenRepo.markEmailVerificationUsed).toHaveBeenCalledWith(verificationToken.id);
  });

  it("retorna INVALID_TOKEN cuando el token no existe", async () => {
    tokenRepo.findEmailVerificationByToken.mockResolvedValue(null);

    const result = await verifyEmail("nonexistent-token", tokenRepo);

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_TOKEN");
    expect(result.userId).toBeUndefined();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("retorna EXPIRED_TOKEN cuando el token está vencido", async () => {
    const expiredToken = makeEmailVerificationToken({
      expiresAt: new Date(Date.now() - 3600_000), // 1 hour ago
    });
    tokenRepo.findEmailVerificationByToken.mockResolvedValue(expiredToken);

    const result = await verifyEmail("expired-token", tokenRepo);

    expect(result.success).toBe(false);
    expect(result.code).toBe("EXPIRED_TOKEN");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("retorna INVALID_TOKEN cuando el token ya fue usado", async () => {
    const usedToken = makeEmailVerificationToken({
      usedAt: new Date(Date.now() - 1000),
    });
    tokenRepo.findEmailVerificationByToken.mockResolvedValue(usedToken);

    const result = await verifyEmail("used-token", tokenRepo);

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_TOKEN");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
