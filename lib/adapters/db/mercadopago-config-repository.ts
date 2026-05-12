import type { IMercadoPagoConfigRepository, MercadoPagoConfig } from "@/lib/ports";
import { prisma } from "./prisma";

function toDomain(c: {
  centerId: string;
  accessToken: string;
  mpUserId: string | null;
  enabled: boolean;
}): MercadoPagoConfig {
  return {
    centerId: c.centerId,
    accessToken: c.accessToken,
    mpUserId: c.mpUserId,
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

  async findByMpUserId(mpUserId: string) {
    const config = await prisma.centerMercadoPagoConfig.findUnique({
      where: { mpUserId },
    });
    return config && config.enabled ? toDomain(config) : null;
  },

  async findStatusByCenterId(centerId: string) {
    const config = await prisma.centerMercadoPagoConfig.findUnique({
      where: { centerId },
    });
    if (!config) return null;
    return {
      enabled: config.enabled,
      hasCredentials: Boolean(config.accessToken?.trim()),
    };
  },

  async updateEnabled(centerId: string, enabled: boolean) {
    await prisma.centerMercadoPagoConfig.update({
      where: { centerId },
      data: { enabled },
    });
  },
};
