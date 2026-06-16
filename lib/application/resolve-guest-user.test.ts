import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveGuestUser } from "./resolve-guest-user";

const mocks = vi.hoisted(() => ({
  userRepository: {
    findAuthSummaryByEmail: vi.fn(),
    updateGuestProfile: vi.fn(),
    findMembership: vi.fn(),
    addRole: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/adapters/db", () => ({
  userRepository: mocks.userRepository,
}));

const INPUT = {
  centerId: "center-1",
  email: "Camila@Correo.cl",
  name: "Camila Rojas",
  phone: "+56 9 1234 5678",
};

describe("resolveGuestUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea un usuario passwordless cuando el email es nuevo", async () => {
    mocks.userRepository.findAuthSummaryByEmail.mockResolvedValue(null);
    mocks.userRepository.create.mockResolvedValue({ id: "user-new" });

    const result = await resolveGuestUser(INPUT);

    expect(result).toEqual({ ok: true, userId: "user-new" });
    expect(mocks.userRepository.create).toHaveBeenCalledWith({
      email: "camila@correo.cl",
      passwordHash: "",
      name: "Camila Rojas",
      phone: "+56 9 1234 5678",
    });
    expect(mocks.userRepository.addRole).toHaveBeenCalledWith("user-new", "center-1", "STUDENT");
  });

  it("reusa un guest previo y completa contacto faltante", async () => {
    mocks.userRepository.findAuthSummaryByEmail.mockResolvedValue({
      id: "user-guest",
      name: null,
      phone: null,
      hasPassword: false,
      emailVerified: false,
    });
    mocks.userRepository.findMembership.mockResolvedValue({ role: "STUDENT", isLegacyClient: false });

    const result = await resolveGuestUser(INPUT);

    expect(result).toEqual({ ok: true, userId: "user-guest" });
    expect(mocks.userRepository.updateGuestProfile).toHaveBeenCalledWith("user-guest", {
      name: "Camila Rojas",
      phone: "+56 9 1234 5678",
    });
    expect(mocks.userRepository.create).not.toHaveBeenCalled();
    // Ya tiene membership → no se vuelve a agregar rol.
    expect(mocks.userRepository.addRole).not.toHaveBeenCalled();
  });

  it("no pisa nombre/teléfono ya presentes del guest", async () => {
    mocks.userRepository.findAuthSummaryByEmail.mockResolvedValue({
      id: "user-guest",
      name: "Nombre Previo",
      phone: "+56 9 9999 9999",
      hasPassword: false,
      emailVerified: false,
    });
    mocks.userRepository.findMembership.mockResolvedValue(null);

    await resolveGuestUser(INPUT);

    expect(mocks.userRepository.updateGuestProfile).toHaveBeenCalledWith("user-guest", {
      name: undefined,
      phone: undefined,
    });
    // Sin membership → se agrega rol STUDENT.
    expect(mocks.userRepository.addRole).toHaveBeenCalledWith("user-guest", "center-1", "STUDENT");
  });

  it("devuelve NEEDS_LOGIN si el email tiene contraseña", async () => {
    mocks.userRepository.findAuthSummaryByEmail.mockResolvedValue({
      id: "user-reg",
      name: "Reg",
      phone: null,
      hasPassword: true,
      emailVerified: false,
    });

    const result = await resolveGuestUser(INPUT);

    expect(result).toEqual({
      ok: false,
      code: "NEEDS_LOGIN",
      message: expect.stringContaining("Inicia sesión"),
    });
    expect(mocks.userRepository.create).not.toHaveBeenCalled();
    expect(mocks.userRepository.updateGuestProfile).not.toHaveBeenCalled();
  });

  it("devuelve NEEDS_LOGIN si el email está verificado", async () => {
    mocks.userRepository.findAuthSummaryByEmail.mockResolvedValue({
      id: "user-reg",
      name: null,
      phone: null,
      hasPassword: false,
      emailVerified: true,
    });

    const result = await resolveGuestUser(INPUT);

    expect(result.ok).toBe(false);
  });
});
