import { NextResponse } from "next/server";
import { subscriptionRepository } from "@/lib/adapters/db";
import { mercadoPagoSubscriptionAdapter } from "@/lib/adapters/payment";
import { mercadopagoConfigRepository } from "@/lib/adapters/db";

/**
 * Back URL de MercadoPago: suscripción autorizada.
 * Sincroniza estado desde MP y redirige al panel.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get("subscriptionId");

  if (subscriptionId) {
    const sub = await subscriptionRepository.findById(subscriptionId);
    if (sub?.mpPreapprovalId) {
      const config = await mercadopagoConfigRepository.findByCenterId(sub.centerId);
      if (config?.enabled) {
        const status = await mercadoPagoSubscriptionAdapter.getPreapproval({
          accessToken: config.accessToken,
          preapprovalId: sub.mpPreapprovalId,
        });
        if (status?.status === "authorized" && status.nextPaymentDate) {
          const periodEnd = new Date(status.nextPaymentDate);
          const periodStart = sub.currentPeriodStart ?? sub.createdAt;
          await subscriptionRepository.updateStatus(sub.id, "ACTIVE", {
            start: periodStart,
            end: periodEnd,
          });
        }
      }
    }
  }

  const base =
    request.headers.get("origin") ??
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000";
  return NextResponse.redirect(`${base}/panel?membresia=ok`);
}
