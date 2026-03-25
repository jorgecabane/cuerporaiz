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

/**
 * Port para suscripciones recurrentes con preaprobación (u otro proveedor).
 * La aplicación depende de esta interfaz; el adapter implementa el contrato.
 * Nunca se manejan datos de tarjeta.
 */
export interface ISubscriptionProvider {
  /** Crea una preaprobación (suscripción recurrente) y devuelve la URL de autorización */
  createPreapproval(dto: CreatePreapprovalDto): Promise<CreatePreapprovalResultDto>;

  /** Re-consulta el estado de una preaprobación en la API del proveedor */
  getPreapproval(dto: GetPreapprovalDto): Promise<PreapprovalStatusDto | null>;

  /** Consulta el estado de un pago autorizado (cobro de suscripción) */
  getAuthorizedPayment(dto: GetAuthorizedPaymentDto): Promise<AuthorizedPaymentStatusDto | null>;

  /** Cancela una preaprobación */
  cancelPreapproval(dto: CancelPreapprovalDto): Promise<CancelPreapprovalResultDto>;
}
