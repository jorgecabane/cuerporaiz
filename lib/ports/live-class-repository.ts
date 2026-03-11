import type { LiveClass } from "@/lib/domain";

export interface ILiveClassRepository {
  findById(id: string): Promise<LiveClass | null>;
  findByCenterId(centerId: string, from?: Date): Promise<LiveClass[]>;
  countConfirmedReservations(liveClassId: string): Promise<number>;
}
