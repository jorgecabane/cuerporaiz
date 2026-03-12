/**
 * Port para suscripciones recurrentes (MercadoPago Preapproval / u otro proveedor).
 * La aplicación depende de esta interfaz; el adapter implementa el contrato.
 */
import type {
  CreateSubscriptionDto,
  CreateSubscriptionResultDto,
  GetPreapprovalDto,
  PreapprovalStatusDto,
  PauseSubscriptionDto,
  CancelSubscriptionDto,
} from "@/lib/dto/subscription-dto";

export interface ISubscriptionProvider {
  /** Crea una preapproval en MP y devuelve la URL para que el usuario autorice (init_point) */
  createSubscription(dto: CreateSubscriptionDto): Promise<CreateSubscriptionResultDto>;

  /** Re-consulta el estado de una preapproval (para webhooks o panel) */
  getPreapproval(dto: GetPreapprovalDto): Promise<PreapprovalStatusDto | null>;

  /** Pausa la suscripción hasta la fecha indicada (v1: hasta 1 mes) */
  pauseSubscription(dto: PauseSubscriptionDto): Promise<{ success: boolean; error?: string }>;

  /** Cancela la suscripción (baja) */
  cancelSubscription(dto: CancelSubscriptionDto): Promise<{ success: boolean; error?: string }>;
}
