import { describe, it, expect } from "vitest";
import * as crypto from "node:crypto";
import { verifyMercadoPagoWebhookSignature } from "./verify-webhook-signature";

describe("verifyMercadoPagoWebhookSignature", () => {
  it("devuelve false si faltan headers/secret", () => {
    expect(
      verifyMercadoPagoWebhookSignature({
        body: "{}",
        xSignature: null,
        xRequestId: "req",
        resourceId: "123",
        webhookSecret: "s",
      })
    ).toBe(false);
  });

  it("valida firma correcta", () => {
    const ts = "1710000000";
    const resourceId = "pay_123";
    const requestId = "req_abc";
    const secret = "whsec_test";
    const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
    const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

    const ok = verifyMercadoPagoWebhookSignature({
      body: "{}",
      xSignature: `ts=${ts},v1=${expected}`,
      xRequestId: requestId,
      resourceId,
      webhookSecret: secret,
    });
    expect(ok).toBe(true);
  });

  it("rechaza firma incorrecta", () => {
    const ts = "1710000000";
    const resourceId = "pay_123";
    const requestId = "req_abc";
    const secret = "whsec_test";
    const bad = "0".repeat(64);

    const ok = verifyMercadoPagoWebhookSignature({
      body: "{}",
      xSignature: `ts=${ts},v1=${bad}`,
      xRequestId: requestId,
      resourceId,
      webhookSecret: secret,
    });
    expect(ok).toBe(false);
  });

  it("rechaza x-signature con formato inválido", () => {
    const ok = verifyMercadoPagoWebhookSignature({
      body: "{}",
      xSignature: "v1=abc,ts=123", // orden/forma distinta a la esperada
      xRequestId: "req",
      resourceId: "id",
      webhookSecret: "s",
    });
    expect(ok).toBe(false);
  });

  it("rechaza si el v1 no tiene largo esperado (hex inválido)", () => {
    const ok = verifyMercadoPagoWebhookSignature({
      body: "{}",
      xSignature: "ts=1710000000,v1=abc", // largo impar → Buffer diferente
      xRequestId: "req",
      resourceId: "id",
      webhookSecret: "s",
    });
    expect(ok).toBe(false);
  });
});

