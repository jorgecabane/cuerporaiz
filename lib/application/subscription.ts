/**
 * Casos de uso para suscripción (membresía recurrente).
 * Crear suscripción → preapproval MP → redirect usuario a autorizar.
 */
import * as crypto from "node:crypto";
import type { ISubscriptionProvider } from "@/lib/ports/subscription-provider";
import {
  centerRepository,
  mercadopagoConfigRepository,
  planRepository,
  subscriptionRepository,
} from "@/lib/adapters/db";
import { mercadoPagoSubscriptionAdapter } from "@/lib/adapters/payment";

const subscriptionProvider: ISubscriptionProvider = mercadoPagoSubscriptionAdapter;

export interface CreateSubscriptionCheckoutInput {
  centerId: string;
  userId: string;
  planId: string;
  payerEmail: string;
  baseUrl: string;
}

export interface CreateSubscriptionCheckoutResult {
  success: boolean;
  redirectUrl?: string;
  subscriptionId?: string;
  error?: string;
}

/**
 * Crea una suscripción (registro PENDING), una preapproval en MP y devuelve la URL para que el usuario autorice.
 * Solo para planes tipo MEMBERSHIP y si el centro tiene MP activo.
 */
export async function createSubscriptionCheckoutUseCase(
  input: CreateSubscriptionCheckoutInput
): Promise<CreateSubscriptionCheckoutResult> {
  const center = await centerRepository.findById(input.centerId);
  if (!center) {
    return { success: false, error: "Centro no encontrado" };
  }

  const config = await mercadopagoConfigRepository.findByCenterId(center.id);
  if (!config || !config.enabled) {
    return { success: false, error: "MercadoPago no está configurado para este centro" };
  }

  const plan = await planRepository.findById(input.planId);
  if (!plan || plan.centerId !== center.id) {
    return { success: false, error: "Plan no encontrado" };
  }
  if (plan.type !== "MEMBERSHIP") {
    return { success: false, error: "Solo planes de membresía permiten suscripción recurrente" };
  }

  const existing = await subscriptionRepository.findActiveByUserAndCenter(input.userId, center.id);
  if (existing) {
    return { success: false, error: "Ya tenés una membresía activa en este centro" };
  }

  const subscription = await subscriptionRepository.create({
    centerId: center.id,
    userId: input.userId,
    planId: plan.id,
  });

  const base = input.baseUrl.replace(/\/$/, "");
  const result = await subscriptionProvider.createSubscription({
    accessToken: config.accessToken,
    reason: plan.name,
    transactionAmount: plan.amountCents,
    currencyId: plan.currency === "CLP" ? "CLP" : plan.currency,
    payerEmail: input.payerEmail,
    frequency: 1,
    frequencyType: "months",
    backUrlSuccess: `${base}/api/subscribe/success?subscriptionId=${subscription.id}`,
    backUrlFailure: `${base}/api/subscribe/failure?subscriptionId=${subscription.id}`,
    backUrlPending: `${base}/api/subscribe/pending?subscriptionId=${subscription.id}`,
    notificationUrl: `${base}/api/webhooks/mercadopago/${center.id}`,
    externalReference: subscription.id,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  if (result.preapprovalId) {
    await subscriptionRepository.updateMpPreapprovalId(subscription.id, result.preapprovalId);
  }

  return {
    success: true,
    redirectUrl: result.checkoutUrl,
    subscriptionId: subscription.id,
  };
}
