import type { IZoomConfigRepository, ZoomConfig } from "@/lib/ports";
import { prisma } from "./prisma";

function toDomain(c: {
  centerId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  enabled: boolean;
}): ZoomConfig {
  return {
    centerId: c.centerId,
    accessToken: c.accessToken,
    refreshToken: c.refreshToken,
    tokenExpiresAt: c.tokenExpiresAt,
    enabled: c.enabled,
  };
}

export const zoomConfigRepository: IZoomConfigRepository = {
  async findByCenterId(centerId: string) {
    const config = await prisma.centerZoomConfig.findUnique({
      where: { centerId },
    });
    return config && config.enabled ? toDomain(config) : null;
  },

  async findStatusByCenterId(centerId: string) {
    const config = await prisma.centerZoomConfig.findUnique({
      where: { centerId },
    });
    if (!config) return null;
    return {
      enabled: config.enabled,
      hasCredentials: Boolean(config.accessToken?.trim()),
    };
  },

  async upsert(centerId: string, data) {
    await prisma.centerZoomConfig.upsert({
      where: { centerId },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? undefined,
        tokenExpiresAt: data.tokenExpiresAt ?? undefined,
        enabled: data.enabled ?? undefined,
      },
      create: {
        centerId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        tokenExpiresAt: data.tokenExpiresAt ?? null,
        enabled: data.enabled ?? true,
      },
    });
  },

  async updateEnabled(centerId: string, enabled: boolean) {
    await prisma.centerZoomConfig.update({
      where: { centerId },
      data: { enabled },
    });
  },
};
