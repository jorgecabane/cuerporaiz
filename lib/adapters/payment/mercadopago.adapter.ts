/**
 * Adapter que implementa IPaymentProvider usando la API REST de MercadoPago.
 * Traduce DTOs ↔ API MP. Nunca se almacenan ni manejan datos de tarjeta.
 */
import type { IPaymentProvider } from "@/lib/ports";
import type {
  CreatePreferenceDto,
  CreatePreferenceResultDto,
  GetPaymentDto,
  PaymentStatusDto,
} from "@/lib/dto/checkout-dto";

const MP_API_BASE = "https://api.mercadopago.com";

function mapStatus(status: string): PaymentStatusDto["status"] {
  const s = status?.toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "pending") return "pending";
  if (s === "cancelled") return "cancelled";
  if (s === "refunded") return "refunded";
  if (s === "charged_back") return "charged_back";
  if (s === "in_mediation") return "in_mediation";
  return "pending";
}

export const mercadoPagoPaymentAdapter: IPaymentProvider = {
  async createPreference(dto: CreatePreferenceDto): Promise<CreatePreferenceResultDto> {
    try {
      const body = {
        items: [
          {
            title: dto.title,
            quantity: dto.quantity,
            unit_price: dto.unitPrice,
          },
        ],
        back_urls: {
          success: dto.backUrls.success,
          failure: dto.backUrls.failure,
          pending: dto.backUrls.pending,
        },
        auto_return: dto.autoReturn ?? "approved",
        external_reference: dto.externalReference,
        notification_url: dto.notificationUrl,
        payer: dto.payerEmail ? { email: dto.payerEmail } : undefined,
      };

      const res = await fetch(`${MP_API_BASE}/checkout/preferences`, {
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
          error: "MercadoPago no devolvió URL de checkout",
        };
      }

      return {
        success: true,
        checkoutUrl: initPoint,
        preferenceId: data.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear preferencia";
      return { success: false, error: message };
    }
  },

  async getPayment(dto: GetPaymentDto): Promise<PaymentStatusDto | null> {
    try {
      const res = await fetch(`${MP_API_BASE}/v1/payments/${dto.paymentId}`, {
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
        status: mapStatus(data.status ?? "pending"),
        statusDetail: data.status_detail,
        externalReference: data.external_reference,
        transactionAmount: data.transaction_amount,
        dateApproved: data.date_approved,
      };
    } catch {
      return null;
    }
  },
};
