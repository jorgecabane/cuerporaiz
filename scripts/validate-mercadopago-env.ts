/**
 * Valida que MP_APP_ID y MP_CLIENT_SECRET sean correctos.
 * Hace un POST a /oauth/token con grant_type=client_credentials (no usa redirect ni code).
 * Uso: npx tsx scripts/validate-mercadopago-env.ts
 */
import "dotenv/config";

const appId = process.env.MP_APP_ID?.trim() ?? "";
const clientSecret = process.env.MP_CLIENT_SECRET?.trim() ?? "";

function main() {
  console.log("Validando credenciales de Mercado Pago (Client ID + Client Secret)...\n");

  if (!appId || !clientSecret) {
    console.error("ERROR: Faltan variables de entorno.");
    console.error("  MP_APP_ID:", appId ? `${appId.slice(0, 4)}...` : "(vacío)");
    console.error("  MP_CLIENT_SECRET:", clientSecret ? "(definido)" : "(vacío)");
    console.error("\nDefinilas en .env y volvé a ejecutar.");
    process.exit(1);
  }

  const isTest = clientSecret.startsWith("TEST-");
  const body: Record<string, string> = {
    client_id: appId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  };
  if (isTest) body.test_token = "true";

  fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      const text = await res.text();
      if (res.ok) {
        const data = JSON.parse(text) as { access_token?: string };
        console.log("OK: Las credenciales son válidas.");
        console.log("  Client ID (MP_APP_ID):", appId);
        console.log("  Modo:", isTest ? "prueba (test_token=true)" : "producción");
        console.log("  Se obtuvo un access_token para la app.");
        console.log("\nPara OAuth (Conectar mi cuenta) asegurate de tener en Mercado Pago:");
        console.log("  • Detalles de la aplicación → URLs de redireccionamiento:");
        console.log("    - Con ngrok: https://TU-DOMINIO-NGROK/api/admin/mercadopago/oauth/callback");
        console.log("    - Local:     http://localhost:3000/api/admin/mercadopago/oauth/callback");
        console.log("\n  • MP_CLIENT_SECRET debe ser el 'Client Secret', NO el 'Access Token' ni la 'Public Key'.");
        return;
      }
      console.error("ERROR: Mercado Pago rechazó las credenciales (status", res.status + ").");
      console.error("Respuesta:", text);
      try {
        const err = JSON.parse(text) as { error?: string; message?: string };
        if (err.error === "invalid_client" || (err.message && err.message.includes("client"))) {
          console.error("\nPosible causa: estás usando el 'Access Token' en lugar del 'Client Secret'.");
          console.error("En el panel de MP (Credenciales de prueba/producción) hay dos valores distintos:");
          console.error("  - Client ID (App ID) → MP_APP_ID");
          console.error("  - Client Secret      → MP_CLIENT_SECRET  (suele empezar con TEST- en prueba)");
          console.error("No uses el 'Access Token' ni la 'Public Key' en MP_CLIENT_SECRET.");
        }
      } catch {
        // ignore
      }
      process.exit(1);
    })
    .catch((e) => {
      console.error("ERROR de red:", e);
      process.exit(1);
    });
}

main();
