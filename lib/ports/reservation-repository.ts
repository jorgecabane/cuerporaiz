import type { Reservation, ReservationStatus } from "@/lib/domain";

export interface IReservationRepository {
  findById(id: string): Promise<Reservation | null>;
  findByUserAndLiveClass(userId: string, liveClassId: string): Promise<Reservation | null>;
  findByUserId(userId: string, options?: { status?: ReservationStatus }): Promise<Reservation[]>;
  create(data: { userId: string; liveClassId: string; userPlanId?: string | null }): Promise<Reservation>;
  updateStatus(id: string, status: ReservationStatus): Promise<Reservation>;
}
