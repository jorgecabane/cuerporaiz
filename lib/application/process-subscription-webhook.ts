/**
 * Casos de uso: procesar webhooks de suscripciones recurrentes de MercadoPago.
 * Maneja `subscription_preapproval` y `subscription_authorized_payment`.
 */
import {
  subscriptionRepository,
  mercadopagoConfigRepository,
  userPlanRepository,
  planRepository,
} from "@/lib/adapters/db";
import { mercadoPagoSubscriptionAdapter } from "@/lib/adapters/payment";
import { computeValidUntil } from "./activate-plan";
import type { SubscriptionStatus } from "@/lib/domain/subscription";
import type { UserPlanStatus } from "@/lib/domain/user-plan";

/** Maps MP preapproval status → our SubscriptionStatus */
export function mapMpStatusToSubscription(mpStatus: string): SubscriptionStatus {
  switch (mpStatus) {
    case "authorized": return "ACTIVE";
    case "paused": return "PAUSED";
    case "cancelled": return "CANCELLED";
    default: return "ACTIVE";
  }
}

/** Maps our SubscriptionStatus → UserPlanStatus */
export function mapMpStatusToUserPlan(subStatus: SubscriptionStatus): UserPlanStatus {
  switch (subStatus) {
    case "ACTIVE": return "ACTIVE";
    case "PAUSED": return "FROZEN";
    case "CANCELLED": return "CANCELLED";
    case "PAYMENT_FAILED": return "FROZEN";
  }
}

/**
 * Handles `subscription_preapproval` webhook.
 * Updates local Subscription status and cascades to UserPlan.
 */
export async function processPreapprovalWebhook(
  centerId: string,
  mpSubscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const config = await mercadopagoConfigRepository.findByCenterId(centerId);
  if (!config?.enabled) return { success: false, error: "MP not configured" };

  const preapproval = await mercadoPagoSubscriptionAdapter.getPreapproval({
    accessToken: config.accessToken,
    mpSubscriptionId,
  });
  if (!preapproval) return { success: false, error: "Could not fetch preapproval" };

  let subscription = await subscriptionRepository.findByMpSubscriptionId(mpSubscriptionId);
  const newStatus = mapMpStatusToSubscription(preapproval.status);

  if (!subscription) {
    return { success: true };
  }

  if (subscription.status !== newStatus) {
    subscription = await subscriptionRepository.updateStatus(subscription.id, newStatus);

    const activeUserPlan = await userPlanRepository.findActiveBySubscriptionId(subscription.id);

    if (activeUserPlan) {
      const userPlanStatus = mapMpStatusToUserPlan(newStatus);
      if (userPlanStatus === "FROZEN") {
        await userPlanRepository.freeze(activeUserPlan.id, `Suscripción ${newStatus.toLowerCase()}`, null);
      } else if (userPlanStatus === "ACTIVE" && activeUserPlan.status === "FROZEN") {
        await userPlanRepository.unfreeze(activeUserPlan.id);
      } else {
        await userPlanRepository.updateStatus(activeUserPlan.id, userPlanStatus);
      }
    }
  }

  return { success: true };
}

/**
 * Handles `subscription_authorized_payment` webhook.
 * Each billing cycle fires this. Creates/renews UserPlan.
 */
export async function processAuthorizedPaymentWebhook(
  centerId: string,
  authorizedPaymentId: string
): Promise<{ success: boolean; error?: string }> {
  const config = await mercadopagoConfigRepository.findByCenterId(centerId);
  if (!config?.enabled) return { success: false, error: "MP not configured" };

  const payment = await mercadoPagoSubscriptionAdapter.getAuthorizedPayment({
    accessToken: config.accessToken,
    authorizedPaymentId,
  });
  if (!payment) return { success: false, error: "Could not fetch authorized payment" };

  const subscription = await subscriptionRepository.findByMpSubscriptionId(payment.preapprovalId);
  if (!subscription) {
    return await handleFirstAuthorizedPayment(payment.preapprovalId, payment);
  }

  if (payment.status !== "approved") {
    if (payment.status === "rejected") {
      await subscriptionRepository.updateStatus(subscription.id, "PAYMENT_FAILED");
    }
    return { success: true };
  }

  const plan = await planRepository.findById(subscription.planId);
  if (!plan) return { success: false, error: "Plan not found" };

  const now = new Date();
  const validUntil = computeValidUntil(plan, now);

  await subscriptionRepository.updatePeriod(
    subscription.id,
    now,
    validUntil ?? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  );

  if (subscription.status !== "ACTIVE") {
    await subscriptionRepository.updateStatus(subscription.id, "ACTIVE");
  }

  // Create new UserPlan for this billing cycle
  await userPlanRepository.create({
    userId: subscription.userId,
    planId: plan.id,
    centerId: subscription.centerId,
    subscriptionId: subscription.id,
    paymentStatus: "PAID",
    classesTotal: plan.maxReservations,
    validFrom: now,
    validUntil,
  });

  return { success: true };
}

async function handleFirstAuthorizedPayment(
  mpSubscriptionId: string,
  payment: { id: string; status: string; transactionAmount: number }
): Promise<{ success: boolean; error?: string }> {
  if (payment.status !== "approved") return { success: true };

  const subscription = await subscriptionRepository.findByMpSubscriptionId(mpSubscriptionId);
  if (!subscription) {
    console.error(`[subscription-webhook] Subscription not found for mpSubscriptionId=${mpSubscriptionId}. First payment dropped.`);
    return { success: false, error: "Subscription not found for first payment" };
  }

  const plan = await planRepository.findById(subscription.planId);
  if (!plan) return { success: false, error: "Plan not found" };

  const now = new Date();
  const validUntil = computeValidUntil(plan, now);

  await userPlanRepository.create({
    userId: subscription.userId,
    planId: plan.id,
    centerId: subscription.centerId,
    subscriptionId: subscription.id,
    paymentStatus: "PAID",
    classesTotal: plan.maxReservations,
    validFrom: now,
    validUntil,
  });

  return { success: true };
}
