/**
 * Adapter que implementa ISubscriptionProvider usando la API REST de MercadoPago Preapproval.
 * Traduce DTOs ↔ API MP. Nunca se almacenan ni manejan datos de tarjeta.
 */
import type { ISubscriptionProvider } from "@/lib/ports/subscription-provider";
import type {
  CreatePreapprovalDto,
  CreatePreapprovalResultDto,
  GetPreapprovalDto,
  PreapprovalStatusDto,
  GetAuthorizedPaymentDto,
  AuthorizedPaymentStatusDto,
  CancelPreapprovalDto,
  CancelPreapprovalResultDto,
} from "@/lib/dto/subscription-dto";

const MP_API = "https://api.mercadopago.com";

function mpHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export const mercadoPagoSubscriptionAdapter: ISubscriptionProvider = {
  async createPreapproval(dto: CreatePreapprovalDto): Promise<CreatePreapprovalResultDto> {
    try {
      const body: Record<string, unknown> = {
        reason: dto.planName,
        auto_recurring: {
          frequency: dto.frequency,
          frequency_type: dto.frequencyType,
          transaction_amount: dto.amountCents,
          currency_id: dto.currency,
        },
        external_reference: dto.externalReference,
        notification_url: dto.notificationUrl,
        back_url: dto.backUrl,
        status: "pending",
      };
      if (dto.payerEmail) {
        body.payer_email = dto.payerEmail;
      }

      const res = await fetch(`${MP_API}/preapproval`, {
        method: "POST",
        headers: mpHeaders(dto.accessToken),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.message ?? `HTTP ${res.status}` };
      }

      return {
        success: true,
        subscriptionUrl: data.init_point,
        mpSubscriptionId: data.id,
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Error creating preapproval" };
    }
  },

  async getPreapproval(dto: GetPreapprovalDto): Promise<PreapprovalStatusDto | null> {
    try {
      const res = await fetch(`${MP_API}/preapproval/${dto.mpSubscriptionId}`, {
        headers: mpHeaders(dto.accessToken),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: data.id,
        status: data.status,
        payerId: data.payer_id ? String(data.payer_id) : null,
        dateCreated: data.date_created,
        lastModified: data.last_modified,
        nextPaymentDate: data.next_payment_date ?? null,
      };
    } catch {
      return null;
    }
  },

  async getAuthorizedPayment(dto: GetAuthorizedPaymentDto): Promise<AuthorizedPaymentStatusDto | null> {
    try {
      const res = await fetch(`${MP_API}/authorized_payments/${dto.authorizedPaymentId}`, {
        headers: mpHeaders(dto.accessToken),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: String(data.id),
        preapprovalId: data.preapproval_id,
        status: data.status,
        transactionAmount: data.transaction_amount,
        dateCreated: data.date_created,
      };
    } catch {
      return null;
    }
  },

  async cancelPreapproval(dto: CancelPreapprovalDto): Promise<CancelPreapprovalResultDto> {
    try {
      const res = await fetch(`${MP_API}/preapproval/${dto.mpSubscriptionId}`, {
        method: "PUT",
        headers: mpHeaders(dto.accessToken),
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.message ?? `HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Error cancelling" };
    }
  },
};
