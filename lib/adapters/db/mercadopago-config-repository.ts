import type { IMercadoPagoConfigRepository, MercadoPagoConfig } from "@/lib/ports";
import { prisma } from "./prisma";

function toDomain(c: {
  centerId: string;
  accessToken: string;
  webhookSecret: string;
  enabled: boolean;
}): MercadoPagoConfig {
  return {
    centerId: c.centerId,
    accessToken: c.accessToken,
    webhookSecret: c.webhookSecret,
    enabled: c.enabled,
  };
}

export const mercadopagoConfigRepository: IMercadoPagoConfigRepository = {
  async findByCenterId(centerId: string) {
    const config = await prisma.centerMercadoPagoConfig.findUnique({
      where: { centerId },
    });
    return config && config.enabled ? toDomain(config) : null;
  },
};
