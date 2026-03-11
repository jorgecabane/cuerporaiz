/**
 * Configuración MercadoPago de un centro (tenant). Solo existe si el plugin está activo.
 */
export interface MercadoPagoConfig {
  centerId: string;
  accessToken: string;
  webhookSecret: string;
  enabled: boolean;
}

export interface IMercadoPagoConfigRepository {
  findByCenterId(centerId: string): Promise<MercadoPagoConfig | null>;
}
