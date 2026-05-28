import { describe, it, expect } from "vitest";
import { decideGoogleSignIn } from "./google-signin-policy";

describe("decideGoogleSignIn", () => {
  it("rechaza si Google no verificó el email", () => {
    expect(
      decideGoogleSignIn({
        googleEmailVerified: false,
        localUser: { googleId: "g123", emailVerifiedAt: new Date() },
      }),
    ).toBe("reject");
  });

  it("rechaza si Google no verificó incluso para usuario nuevo (sin local)", () => {
    expect(
      decideGoogleSignIn({ googleEmailVerified: false, localUser: null }),
    ).toBe("reject");
  });

  it("crea usuario nuevo si Google verificó y no hay local", () => {
    expect(
      decideGoogleSignIn({ googleEmailVerified: true, localUser: null }),
    ).toBe("allow_new_user");
  });

  it("permite link si local ya tiene googleId (login normal del dueño)", () => {
    expect(
      decideGoogleSignIn({
        googleEmailVerified: true,
        localUser: { googleId: "g123", emailVerifiedAt: null },
      }),
    ).toBe("allow_link");
  });

  it("RECHAZA si local sin vincular Y sin emailVerifiedAt (anti takeover C5)", () => {
    expect(
      decideGoogleSignIn({
        googleEmailVerified: true,
        localUser: { googleId: null, emailVerifiedAt: null },
      }),
    ).toBe("reject");
  });

  it("auto-link si local sin vincular pero verificado (dueño ya demostró control)", () => {
    expect(
      decideGoogleSignIn({
        googleEmailVerified: true,
        localUser: { googleId: null, emailVerifiedAt: new Date() },
      }),
    ).toBe("allow_link");
  });
});
