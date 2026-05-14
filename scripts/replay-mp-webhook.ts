import crypto from "node:crypto";

const WEBHOOK_URL = "https://cuerporaiz.cl/api/webhooks/mercadopago";
const PAYMENT_ID = "159192764346";
const MP_USER_ID = "3352249942";

const secret = process.env.MP_WEBHOOK_SECRET;
if (!secret) {
  console.error("Missing MP_WEBHOOK_SECRET in env");
  process.exit(1);
}

const body = {
  action: "payment.created",
  api_version: "v1",
  data: { id: PAYMENT_ID },
  date_created: "2026-05-14T00:48:27Z",
  id: 132105390642,
  live_mode: true,
  type: "payment",
  user_id: MP_USER_ID,
};

const bodyRaw = JSON.stringify(body);
const requestId = `replay-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const ts = Math.floor(Date.now() / 1000).toString();
const manifest = `id:${PAYMENT_ID};request-id:${requestId};ts:${ts};`;
const v1 = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
const xSignature = `ts=${ts},v1=${v1}`;

async function main() {
  console.log("POST", WEBHOOK_URL);
  console.log("x-request-id:", requestId);
  console.log("x-signature:", xSignature);
  console.log("body:", bodyRaw);

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": xSignature,
      "x-request-id": requestId,
    },
    body: bodyRaw,
  });

  const text = await res.text();
  console.log("\nResponse status:", res.status);
  console.log("Response body:", text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
