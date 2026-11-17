import { describe, it, expect, beforeEach } from "vitest";
import { isCronAuthorized } from "./cron-auth";

const req = (authorization?: string) =>
  new Request("https://x.test/api/cron/x", { headers: authorization ? { authorization } : {} });

beforeEach(() => {
  process.env.CRON_SECRET = "s3cret";
});

describe("isCronAuthorized", () => {
  it("acepta el Bearer con el CRON_SECRET", () => {
    expect(isCronAuthorized(req("Bearer s3cret"))).toBe(true);
  });

  it("rechaza sin header", () => {
    expect(isCronAuthorized(req())).toBe(false);
  });

  it("rechaza un secreto distinto", () => {
    expect(isCronAuthorized(req("Bearer otro"))).toBe(false);
  });
});
