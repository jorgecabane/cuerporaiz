/**
 * Adapter de suscripciones (membresía recurrente) con MercadoPago Preapproval API.
 * Traduce DTOs ↔ API MP. Una suscripción sin plan asociado: usuario autoriza en init_point.
 */
import type { ISubscriptionProvider } from "@/lib/ports/subscription-provider";
import type {
  CreateSubscriptionDto,
  CreateSubscriptionResultDto,
  GetPreapprovalDto,
  PreapprovalStatusDto,
  PauseSubscriptionDto,
  CancelSubscriptionDto,
} from "@/lib/dto/subscription-dto";

const MP_API_BASE = "https://api.mercadopago.com";

function mapPreapprovalStatus(status: string): PreapprovalStatusDto["status"] {
  const s = status?.toLowerCase();
  if (s === "authorized") return "authorized";
  if (s === "pending") return "pending";
  if (s === "paused") return "paused";
  if (s === "cancelled") return "cancelled";
  if (s === "pending_payment") return "pending_payment";
  return "pending";
}

export const mercadoPagoSubscriptionAdapter: ISubscriptionProvider = {
  async createSubscription(dto: CreateSubscriptionDto): Promise<CreateSubscriptionResultDto> {
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 2);

      const body = {
        reason: dto.reason,
        payer_email: dto.payerEmail,
        external_reference: dto.externalReference,
        back_url: dto.backUrlSuccess,
        notification_url: dto.notificationUrl,
        auto_recurring: {
          frequency: dto.frequency,
          frequency_type: dto.frequencyType,
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          transaction_amount: dto.currencyId === "CLP" ? dto.transactionAmount : dto.transactionAmount / 100,
          currency_id: dto.currencyId,
        },
      };

      const res = await fetch(`${MP_API_BASE}/preapproval`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dto.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: data.message ?? data.error ?? `HTTP ${res.status}`,
        };
      }

      const initPoint = data.init_point ?? data.sandbox_init_point;
      if (!initPoint) {
        return {
          success: false,
          error: "MercadoPago no devolvió URL de suscripción",
        };
      }

      return {
        success: true,
        checkoutUrl: initPoint,
        preapprovalId: data.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear suscripción";
      return { success: false, error: message };
    }
  },

  async getPreapproval(dto: GetPreapprovalDto): Promise<PreapprovalStatusDto | null> {
    try {
      const res = await fetch(`${MP_API_BASE}/preapproval/${dto.preapprovalId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${dto.accessToken}`,
        },
      });

      if (res.status === 404) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return null;

      return {
        id: String(data.id),
        status: mapPreapprovalStatus(data.status ?? "pending"),
        payerEmail: data.payer_email,
        initPoint: data.init_point,
        dateCreated: data.date_created,
        dateLastApproved: data.date_last_approved,
        nextPaymentDate: data.next_payment_date ?? data.auto_recurring?.end_date,
      };
    } catch {
      return null;
    }
  },

  async pauseSubscription(dto: PauseSubscriptionDto): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${MP_API_BASE}/preapproval/${dto.preapprovalId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${dto.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "paused",
          end_date: dto.endDate,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.message ?? data.error ?? `HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al pausar suscripción";
      return { success: false, error: message };
    }
  },

  async cancelSubscription(dto: CancelSubscriptionDto): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${MP_API_BASE}/preapproval/${dto.preapprovalId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${dto.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.message ?? data.error ?? `HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cancelar suscripción";
      return { success: false, error: message };
    }
  },
};
