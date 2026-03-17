import type { Reservation, ReservationStatus } from "@/lib/domain";

export interface FindByUserIdPaginatedOptions {
  status?: ReservationStatus;
  limit: number;
  offset: number;
}

export interface FindByUserIdAndCenterPaginatedOptions {
  centerId: string;
  /** Un solo status (legacy). Ignorado si statuses está presente. */
  status?: ReservationStatus;
  /** Varios statuses. Si está presente, filtra por status in statuses. Si no se pasa nada, devuelve todas. */
  statuses?: ReservationStatus[];
  limit: number;
  offset: number;
}

export interface IReservationRepository {
  findById(id: string): Promise<Reservation | null>;
  findByUserAndLiveClass(userId: string, liveClassId: string): Promise<Reservation | null>;
  findByUserId(userId: string, options?: { status?: ReservationStatus }): Promise<Reservation[]>;
  findByUserIdPaginated(userId: string, options: FindByUserIdPaginatedOptions): Promise<{ items: Reservation[]; total: number }>;
  findByUserIdAndCenterPaginated(userId: string, options: FindByUserIdAndCenterPaginatedOptions): Promise<{ items: Reservation[]; total: number }>;
  countByUserAndStatus(userId: string, centerId: string, status: ReservationStatus, since: Date): Promise<number>;
  hasTrialReservation(userId: string, centerId: string): Promise<boolean>;
  create(data: { userId: string; liveClassId: string; userPlanId?: string | null }): Promise<Reservation>;
  updateStatus(id: string, status: ReservationStatus): Promise<Reservation>;
}
