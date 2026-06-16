import { describe, it, expect, vi, beforeEach } from "vitest";
import { claimGuestAccount, type ClaimGuestAccountDeps } from "./claim-guest-account";

function makeDeps(overrides: Partial<ClaimGuestAccountDeps> = {}): ClaimGuestAccountDeps {
  return {
    findTicketByClaimToken: vi.fn().mockResolvedValue({ id: "ticket-1", userId: "user-1" }),
    findUserAuthById: vi.fn().mockResolvedValue({ hasPassword: false, emailVerified: false }),
    setPasswordAndVerify: vi.fn().mockResolvedValue(undefined),
    hashPassword: vi.fn().mockResolvedValue("hashed"),
    ...overrides,
  };
}

const INPUT = { ticketId: "ticket-1", token: "tok-1", password: "supersecret" };

describe("claimGuestAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("setea contraseña + verifica para un guest passwordless", async () => {
    const deps = makeDeps();
    const result = await claimGuestAccount(INPUT, deps);

    expect(result).toEqual({ success: true });
    expect(deps.hashPassword).toHaveBeenCalledWith("supersecret");
    expect(deps.setPasswordAndVerify).toHaveBeenCalledWith("user-1", "hashed");
  });

  it("rechaza contraseñas cortas sin tocar la cuenta", async () => {
    const deps = makeDeps();
    const result = await claimGuestAccount({ ...INPUT, password: "1234" }, deps);

    expect(result).toEqual({ success: false, code: "WEAK_PASSWORD" });
    expect(deps.findTicketByClaimToken).not.toHaveBeenCalled();
    expect(deps.setPasswordAndVerify).not.toHaveBeenCalled();
  });

  it("rechaza token inexistente", async () => {
    const deps = makeDeps({ findTicketByClaimToken: vi.fn().mockResolvedValue(null) });
    const result = await claimGuestAccount(INPUT, deps);
    expect(result).toEqual({ success: false, code: "INVALID_TOKEN" });
  });

  it("rechaza si el ticketId no coincide con el del token", async () => {
    const deps = makeDeps({
      findTicketByClaimToken: vi.fn().mockResolvedValue({ id: "otro-ticket", userId: "user-1" }),
    });
    const result = await claimGuestAccount(INPUT, deps);
    expect(result).toEqual({ success: false, code: "INVALID_TOKEN" });
  });

  it("rechaza si la cuenta ya tiene contraseña", async () => {
    const deps = makeDeps({
      findUserAuthById: vi.fn().mockResolvedValue({ hasPassword: true, emailVerified: false }),
    });
    const result = await claimGuestAccount(INPUT, deps);
    expect(result).toEqual({ success: false, code: "ALREADY_REGISTERED" });
    expect(deps.setPasswordAndVerify).not.toHaveBeenCalled();
  });

  it("rechaza si el email ya está verificado", async () => {
    const deps = makeDeps({
      findUserAuthById: vi.fn().mockResolvedValue({ hasPassword: false, emailVerified: true }),
    });
    const result = await claimGuestAccount(INPUT, deps);
    expect(result).toEqual({ success: false, code: "ALREADY_REGISTERED" });
  });
});
