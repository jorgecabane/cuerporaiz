/**
 * Configuración Google Meet de un centro (plugin videollamadas). OAuth por centro.
 */
export interface GoogleMeetConfig {
  centerId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  enabled: boolean;
}

export interface IGoogleMeetConfigRepository {
  findByCenterId(centerId: string): Promise<GoogleMeetConfig | null>;
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
