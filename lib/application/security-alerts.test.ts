import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendSecurityAlert } from "./security-alerts";
import type { SendEmailDto } from "@/lib/dto/email-dto";

const sentEmails: SendEmailDto[] = [];
const fakeSender = vi.fn(async (dto: SendEmailDto) => {
  sentEmails.push(dto);
});

beforeEach(() => {
  sentEmails.length = 0;
  fakeSender.mockClear();
  vi.stubEnv("SECURITY_ALERT_EMAIL", "alerts@example.com");
  vi.stubEnv("EMAIL_FROM", "noreply@cuerporaiz.cl");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendSecurityAlert", () => {
  it("manda un email al SECURITY_ALERT_EMAIL configurado", async () => {
    await sendSecurityAlert(
      {
        kind: "mp_amount_mismatch",
        severity: "CRITICAL",
        metadata: { orderId: "ord_123", expected: 10000, paid: 1 },
      },
      { sendEmail: fakeSender }
    );

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toEqual(["alerts@example.com"]);
  });

  it("incluye kind y severity en el asunto", async () => {
    await sendSecurityAlert(
      {
        kind: "mp_center_mismatch",
        severity: "CRITICAL",
        metadata: { orderId: "ord_x" },
      },
      { sendEmail: fakeSender }
    );

    expect(sentEmails[0].subject).toContain("mp_center_mismatch");
    expect(sentEmails[0].subject).toContain("CRITICAL");
    expect(sentEmails[0].subject).toContain("cuerporaiz");
  });

  it("serializa metadata en el body para que sea diagnosticable", async () => {
    await sendSecurityAlert(
      {
        kind: "mp_invalid_signature",
        severity: "HIGH",
        metadata: { mpUserId: "12345", requestId: "req-abc" },
      },
      { sendEmail: fakeSender }
    );

    expect(sentEmails[0].text).toContain("mp_invalid_signature");
    expect(sentEmails[0].text).toContain("HIGH");
    expect(sentEmails[0].text).toContain("12345");
    expect(sentEmails[0].text).toContain("req-abc");
  });

  it("usa el EMAIL_FROM configurado", async () => {
    await sendSecurityAlert(
      { kind: "test", severity: "WARNING", metadata: {} },
      { sendEmail: fakeSender }
    );

    expect(sentEmails[0].from).toBe("noreply@cuerporaiz.cl");
  });

  it("no lanza ni manda email si SECURITY_ALERT_EMAIL no está configurado", async () => {
    vi.stubEnv("SECURITY_ALERT_EMAIL", "");

    await expect(
      sendSecurityAlert(
        { kind: "test", severity: "CRITICAL", metadata: {} },
        { sendEmail: fakeSender }
      )
    ).resolves.toBeUndefined();

    expect(sentEmails).toHaveLength(0);
  });

  it("escapa HTML en el cuerpo para evitar que metadata raro rompa el render", async () => {
    await sendSecurityAlert(
      {
        kind: "test",
        severity: "WARNING",
        metadata: { malicious: "<script>alert(1)</script>" },
      },
      { sendEmail: fakeSender }
    );

    expect(sentEmails[0].html).not.toContain("<script>");
    expect(sentEmails[0].html).toContain("&lt;script&gt;");
  });
});
