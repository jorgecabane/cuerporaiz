import type { ReservationDto } from "@/lib/dto/reservation-dto";

export const TAB_HOY = "hoy";
export const TAB_PROXIMAS = "proximas";
export const TAB_CANCELADAS = "canceladas";
export const TAB_HISTORICAS = "historicas";

export type ReservationsTabId =
  | typeof TAB_HOY
  | typeof TAB_PROXIMAS
  | typeof TAB_CANCELADAS
  | typeof TAB_HISTORICAS;

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function segmentReservations(
  items: ReservationDto[]
): Record<ReservationsTabId, ReservationDto[]> {
  const now = new Date();
  const hoy: ReservationDto[] = [];
  const proximas: ReservationDto[] = [];
  const canceladas: ReservationDto[] = [];
  const historicas: ReservationDto[] = [];

  for (const r of items) {
    const startsAt = r.liveClass?.startsAt ? new Date(r.liveClass.startsAt) : null;

    if (r.status === "CANCELLED" || r.status === "LATE_CANCELLED") {
      canceladas.push(r);
      continue;
    }
    if (r.status === "ATTENDED" || r.status === "NO_SHOW") {
      historicas.push(r);
      continue;
    }
    if (r.status === "CONFIRMED" && startsAt) {
      if (startsAt <= now) {
        historicas.push(r);
      } else if (isToday(r.liveClass!.startsAt)) {
        hoy.push(r);
      } else {
        proximas.push(r);
      }
      continue;
    }
    historicas.push(r);
  }

  return { hoy, proximas, canceladas, historicas };
}

export function canCancelReservation(r: ReservationDto): boolean {
  if (r.status !== "CONFIRMED") return false;
  const startsAt = r.liveClass?.startsAt;
  if (!startsAt) return false;
  return new Date(startsAt) > new Date();
}
