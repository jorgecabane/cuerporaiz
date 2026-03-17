/**
 * Configuración Zoom de un centro (plugin videollamadas). OAuth por centro.
 */
export interface ZoomConfig {
  centerId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  enabled: boolean;
}

export interface IZoomConfigRepository {
  findByCenterId(centerId: string): Promise<ZoomConfig | null>;
  findStatusByCenterId(centerId: string): Promise<{ enabled: boolean; hasCredentials: boolean } | null>;
  upsert(
    centerId: string,
    data: {
      accessToken: string;
      refreshToken?: string | null;
      tokenExpiresAt?: Date | null;
      enabled?: boolean;
    }
  ): Promise<void>;
  updateEnabled(centerId: string, enabled: boolean): Promise<void>;
}
