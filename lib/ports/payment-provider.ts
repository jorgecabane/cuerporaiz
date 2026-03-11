import type {
  CreatePreferenceDto,
  CreatePreferenceResultDto,
  GetPaymentDto,
  PaymentStatusDto,
} from "@/lib/dto/checkout-dto";

/**
 * Port para pagos con MercadoPago (u otro proveedor). La aplicación depende de esta interfaz;
 * el adapter implementa el contrato. Nunca se manejan datos de tarjeta.
 */
export interface IPaymentProvider {
  /** Crea una preferencia de pago (Checkout Pro) y devuelve la URL de redirección */
  createPreference(dto: CreatePreferenceDto): Promise<CreatePreferenceResultDto>;

  /** Re-consulta el estado de un pago en la API del proveedor (para webhooks) */
  getPayment(dto: GetPaymentDto): Promise<PaymentStatusDto | null>;
}
