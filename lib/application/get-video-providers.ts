import { zoomConfigRepository, googleMeetConfigRepository } from "@/lib/adapters/db";

export type VideoProviders = { zoom: boolean; meet: boolean };

/** Proveedores de videollamada habilitados y con credenciales para el centro. */
export async function getVideoProviders(centerId: string): Promise<VideoProviders> {
  const [zoom, meet] = await Promise.all([
    zoomConfigRepository.findStatusByCenterId(centerId),
    googleMeetConfigRepository.findStatusByCenterId(centerId),
  ]);
  return {
    zoom: !!(zoom?.enabled && zoom?.hasCredentials),
    meet: !!(meet?.enabled && meet?.hasCredentials),
  };
}
