/**
 * Casos de uso: crear checkout (preferencia MP) y procesar webhook.
 * Orquestan puertos; nunca manejan datos de tarjeta.
 */
import * as crypto from "node:crypto";
import type { IPaymentProvider } from "@/lib/ports";
import type { OrderStatus } from "@/lib/ports/order-repository";
import {
  centerRepository,
  mercadopagoConfigRepository,
  planRepository,
  orderRepository,
  webhookEventRepository,
} from "@/lib/adapters/db";
import { mercadoPagoPaymentAdapter } from "@/lib/adapters/payment";
import { verifyMercadoPagoWebhookSignature } from "./verify-webhook-signature";
import type { WebhookProcessResultDto } from "@/lib/dto/checkout-dto";
import {
  processPreapprovalWebhook,
  processAuthorizedPaymentWebhook,
} from "./process-subscription-webhook";

const paymentProvider: IPaymentProvider = mercadoPagoPaymentAdapter;

const ORDER_STATUS_BY_MP: Record<string, OrderStatus> = {
  approved: "APPROVED",
  rejected: "REJECTED",
  pending: "PENDING",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
  charged_back: "REJECTED",
  in_mediation: "PENDING",
};

export interface CreateCheckoutInput {
  centerId: string;
  userId: string;
  planId: string;
  /** Base URL del sitio (ej. https://app.cuerporaiz.cl o http://localhost:3000) */
  baseUrl: string;
  /** Email del usuario (opcional, para pre-llenar en MP) */
  payerEmail?: string;
  /** Nombre y apellido del usuario (recomendación MP para aprobación) */
  payerFirstName?: string;
  payerLastName?: string;
}

export interface CreateCheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  orderId?: string;
  error?: string;
}

/**
 * Crea una orden en PENDING, una preferencia en MercadoPago y devuelve la URL de checkout.
 * Solo si el centro tiene el plugin MP activo y configurado.
 */
export async function createCheckoutUseCase(
  input: CreateCheckoutInput
): Promise<CreateCheckoutResult> {
  const orderRes = await createPendingOrderForPlan({
    centerId: input.centerId,
    userId: input.userId,
    planId: input.planId,
  });
  if (!orderRes.success) return { success: false, error: orderRes.error };

  return await createMpPreferenceForOrder({
    orderId: orderRes.orderId,
    baseUrl: input.baseUrl,
    payerEmail: input.payerEmail,
    payerFirstName: input.payerFirstName,
    payerLastName: input.payerLastName,
  });
}

export interface CreatePendingOrderInput {
  centerId: string;
  userId: string;
  planId: string;
}

export type CreatePendingOrderResult =
  | { success: true; orderId: string }
  | { success: false; error: string };

/**
 * Crea una Order en PENDING sin método de pago decidido todavía.
 * Usado cuando el centro permite transferencia: la alumna eligirá MP o transferencia
 * en `/panel/checkout/[orderId]`.
 */
export async function createPendingOrderForPlan(
  input: CreatePendingOrderInput,
): Promise<CreatePendingOrderResult> {
  const center = await centerRepository.findById(input.centerId);
  if (!center) return { success: false, error: "Centro no encontrado" };

  const plan = await planRepository.findById(input.planId);
  if (!plan || plan.centerId !== center.id) {
    return { success: false, error: "Plan no encontrado" };
  }

  const externalRef = `ord_${crypto.randomUUID()}`;
  const order = await orderRepository.create({
    centerId: center.id,
    userId: input.userId,
    planId: plan.id,
    amountCents: plan.amountCents,
    currency: plan.currency,
    externalReference: externalRef,
  });

  return { success: true, orderId: order.id };
}

export interface CreateMpPreferenceInput {
  orderId: string;
  baseUrl: string;
  payerEmail?: string;
  payerFirstName?: string;
  payerLastName?: string;
}

/**
 * Crea (o reutiliza) la preferencia de MercadoPago para una Order PENDING existente
 * y devuelve la URL del checkout. Si la Order ya tiene `mpPreferenceId`, intenta
 * reutilizarlo (la URL de MP es estable mientras la preferencia exista).
 */
export async function createMpPreferenceForOrder(
  input: CreateMpPreferenceInput,
): Promise<CreateCheckoutResult> {
  const order = await orderRepository.findById(input.orderId);
  if (!order) return { success: false, error: "Orden no encontrada" };
  if (order.status !== "PENDING") {
    return { success: false, error: "Esta orden ya no admite pago" };
  }
  if (order.transferClaimedAt) {
    return { success: false, error: "Esta orden ya está pendiente por transferencia" };
  }

  const center = await centerRepository.findById(order.centerId);
  if (!center) return { success: false, error: "Centro no encontrado" };

  const config = await mercadopagoConfigRepository.findByCenterId(center.id);
  if (!config || !config.enabled) {
    return { success: false, error: "MercadoPago no está configurado para este centro" };
  }

  const plan = await planRepository.findById(order.planId);
  if (!plan) return { success: false, error: "Plan no encontrado" };

  const base = input.baseUrl.replace(/\/$/, "");
  const isHttps = base.startsWith("https://");
  const autoReturn = isHttps ? ("approved" as const) : undefined;
  const statementDescriptor = (center.name ?? "CUERPORAIZ")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 22) || "CUERPORAIZ";

  const result = await paymentProvider.createPreference({
    accessToken: config.accessToken,
    title: plan.name,
    quantity: 1,
    unitPrice: plan.amountCents,
    externalReference: order.externalReference,
    backUrls: {
      success: `${base}/api/checkout/success?centerId=${center.id}`,
      failure: `${base}/api/checkout/failure?centerId=${center.id}`,
      pending: `${base}/api/checkout/pending?centerId=${center.id}`,
    },
    notificationUrl: `${base}/api/webhooks/mercadopago/${center.id}`,
    autoReturn,
    payerEmail: input.payerEmail,
    payerFirstName: input.payerFirstName,
    payerLastName: input.payerLastName,
    statementDescriptor,
    itemId: plan.id,
    itemDescription: plan.description ?? undefined,
    itemCategoryId: "services",
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const { prisma } = await import("@/lib/adapters/db/prisma");
  await prisma.order.update({
    where: { id: order.id },
    data: { mpPreferenceId: result.preferenceId },
  });

  return {
    success: true,
    checkoutUrl: result.checkoutUrl,
    orderId: order.id,
  };
}

export interface ProcessWebhookInput {
  centerId: string;
  bodyRaw: string;
  xSignature: string | null;
  xRequestId: string | null;
}

/**
 * Valida firma, idempotencia, re-consulta el pago en MP y actualiza la orden.
 */
export async function processWebhookUseCase(
  input: ProcessWebhookInput
): Promise<WebhookProcessResultDto> {
  const config = await mercadopagoConfigRepository.findByCenterId(input.centerId);
  if (!config || !config.enabled) {
    return { success: false, error: "MercadoPago no configurado para este centro" };
  }

  let body: { type?: string; data?: { id?: string }; id?: string };
  try {
    body = JSON.parse(input.bodyRaw) as { type?: string; data?: { id?: string }; id?: string };
  } catch {
    return { success: false, error: "Body JSON inválido" };
  }

  const resourceId = body.data?.id ?? body.id;
  if (!resourceId) {
    return { success: false, error: "Falta id del recurso en la notificación" };
  }

  const requestId = input.xRequestId ?? "";
  if (!requestId) {
    return { success: false, error: "Falta x-request-id" };
  }

  const valid = verifyMercadoPagoWebhookSignature({
    body: input.bodyRaw,
    xSignature: input.xSignature,
    xRequestId: input.xRequestId,
    resourceId: String(resourceId),
    webhookSecret: config.webhookSecret,
  });
  if (!valid) {
    return { success: false, error: "Firma del webhook inválida" };
  }

  const already = await webhookEventRepository.wasProcessed(input.centerId, requestId);
  if (already) {
    return { success: true, alreadyProcessed: true };
  }

  // ── Subscription topic routing ──────────────────────────────────────
  const type = body.type as string | undefined;

  if (type === "subscription_preapproval") {
    const result = await processPreapprovalWebhook(input.centerId, String(resourceId));
    await webhookEventRepository.markProcessed(input.centerId, requestId);
    return { success: result.success, alreadyProcessed: false, error: result.error };
  }

  if (type === "subscription_authorized_payment") {
    const result = await processAuthorizedPaymentWebhook(input.centerId, String(resourceId));
    await webhookEventRepository.markProcessed(input.centerId, requestId);
    return { success: result.success, alreadyProcessed: false, error: result.error };
  }
  // ── End subscription routing ────────────────────────────────────────

  const paymentId = String(body.data?.id ?? resourceId);
  const payment = await paymentProvider.getPayment({
    accessToken: config.accessToken,
    paymentId,
  });
  if (!payment) {
    return { success: false, error: "No se pudo re-consultar el pago en MercadoPago" };
  }

  const order = await orderRepository.findByExternalReference(payment.externalReference ?? "")
    ?? await orderRepository.findByMpPaymentId(payment.id);
  if (!order) {
    await webhookEventRepository.markProcessed(input.centerId, requestId);
    return { success: true, alreadyProcessed: false };
  }

  const status = ORDER_STATUS_BY_MP[payment.status] ?? "PENDING";
  await orderRepository.updateStatus(order.id, status, payment.id);

  if (status === "APPROVED") {
    const { activatePlanForOrder } = await import("./activate-plan");
    await activatePlanForOrder(order.id, order.userId, order.planId, order.centerId);
  }

  if (status === "REJECTED") {
    const [{ buildPaymentFailedEmail }, { sendEmailSafe }, { getEmailBranding }, { getBaseUrl }, { userRepository, planRepository }] = await Promise.all([
      import("@/lib/email"),
      import("./send-email"),
      import("@/lib/email/branding"),
      import("@/lib/utils/base-url"),
      import("@/lib/adapters/db"),
    ]);
    const [user, plan] = await Promise.all([
      userRepository.findById(order.userId),
      planRepository.findById(order.planId),
    ]);
    if (user && plan) {
      const branding = await getEmailBranding(order.centerId);
      sendEmailSafe(buildPaymentFailedEmail({
        toEmail: user.email,
        userName: user.name ?? undefined,
        productName: plan.name,
        retryPaymentUrl: `${getBaseUrl()}/panel/tienda`,
        branding,
      }));
    }
  }

  await webhookEventRepository.markProcessed(input.centerId, requestId);

  return { success: true, alreadyProcessed: false };
}
