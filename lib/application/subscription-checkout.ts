/**
 * Caso de uso: crear una suscripción recurrente (preapproval) en MercadoPago.
 */
import * as crypto from "node:crypto";
import {
  centerRepository,
  mercadopagoConfigRepository,
  planRepository,
  subscriptionRepository,
} from "@/lib/adapters/db";
import { mercadoPagoSubscriptionAdapter } from "@/lib/adapters/payment";
import { computeValidUntil } from "./activate-plan";

export interface CreateSubscriptionCheckoutInput {
  centerId: string;
  userId: string;
  planId: string;
  baseUrl: string;
  payerEmail: string;
}

export interface CreateSubscriptionCheckoutResult {
  success: boolean;
  subscriptionUrl?: string;
  error?: string;
}

/** Compute subscription price applying recurring discount */
export function computeSubscriptionAmount(
  amountCents: number,
  recurringDiscountPercent: number | null
): number {
  const discount = recurringDiscountPercent ?? 0;
  return Math.round(amountCents * (1 - discount / 100));
}

/** Maps plan.validityPeriod to MP frequency in months */
function periodToMonths(period: string | null): number {
  switch (period) {
    case "MONTHLY": return 1;
    case "QUARTERLY": return 3;
    case "QUADRIMESTRAL": return 4;
    case "SEMESTER": return 6;
    case "ANNUAL": return 12;
    default: return 1;
  }
}

export async function createSubscriptionCheckoutUseCase(
  input: CreateSubscriptionCheckoutInput
): Promise<CreateSubscriptionCheckoutResult> {
  const center = await centerRepository.findById(input.centerId);
  if (!center) return { success: false, error: "Centro no encontrado" };

  const config = await mercadopagoConfigRepository.findByCenterId(center.id);
  if (!config?.enabled) return { success: false, error: "MercadoPago no configurado" };

  const plan = await planRepository.findById(input.planId);
  if (!plan || plan.centerId !== center.id) return { success: false, error: "Plan no encontrado" };

  if (plan.billingMode !== "RECURRING" && plan.billingMode !== "BOTH") {
    return { success: false, error: "Este plan no admite suscripción recurrente" };
  }

  const amount = computeSubscriptionAmount(plan.amountCents, plan.recurringDiscountPercent);
  const frequency = periodToMonths(plan.validityPeriod);
  const externalRef = `sub_${crypto.randomUUID()}`;
  const base = input.baseUrl.replace(/\/$/, "");

  const result = await mercadoPagoSubscriptionAdapter.createPreapproval({
    accessToken: config.accessToken,
    planName: plan.name,
    amountCents: amount,
    currency: plan.currency,
    frequency,
    frequencyType: "months",
    payerEmail: input.payerEmail,
    externalReference: externalRef,
    notificationUrl: `${base}/api/webhooks/mercadopago/${center.id}`,
    backUrl: `${base}/panel/tienda?subscription=pending`,
  });

  if (!result.success) return { success: false, error: result.error };

  const now = new Date();
  const validUntil = computeValidUntil(plan, now);

  await subscriptionRepository.create({
    centerId: center.id,
    userId: input.userId,
    planId: plan.id,
    mpSubscriptionId: result.mpSubscriptionId!,
    status: "ACTIVE",
    currentPeriodStart: now,
    currentPeriodEnd: validUntil ?? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
  });

  return {
    success: true,
    subscriptionUrl: result.subscriptionUrl,
  };
}
