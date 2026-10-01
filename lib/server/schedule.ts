import { prisma } from "@/lib/adapters/db";
import type { Plan } from "@/lib/ports/plan-repository";
import { summarizeScheduleByDiscipline } from "@/lib/domain/class-schedule-summary";

const WEEK_DAYS = 7;
const MAX_CLASSES = 50;
/** El sidebar muestra los primeros N (orden del admin); el resto está en la tienda. */
const MAX_SIDEBAR_PLANS = 6;

/**
 * Clases de los próximos 7 días (home y /horarios) + resumen de horario por
 * práctica ("Lunes y miércoles 08:00") calculado desde esas mismas clases.
 */
export async function loadWeekSchedule(centerId: string, timeZone: string) {
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + WEEK_DAYS);
  const upcoming = await prisma.liveClass.findMany({
    where: { centerId, startsAt: { gte: now, lte: weekFromNow }, status: "ACTIVE" },
    include: {
      discipline: true,
      _count: { select: { reservations: { where: { status: "CONFIRMED" } } } },
    },
    orderBy: { startsAt: "asc" },
    take: MAX_CLASSES,
  });

  const classes = upcoming.map((c) => ({
    time: c.startsAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }),
    type: c.discipline?.name ?? c.title,
    description: c.discipline?.description ?? undefined,
    duration: `${c.durationMinutes} min`,
    spotsUsed: c._count.reservations,
    spotsTotal: c.maxCapacity,
    dayOfWeek: new Date(c.startsAt.toLocaleString("en-US", { timeZone })).getDay(),
  }));

  return { classes, scheduleByDiscipline: summarizeScheduleByDiscipline(upcoming, timeZone) };
}

/** Planes presenciales para el sidebar del calendario. */
export function toLivePlans(plans: Plan[]) {
  return plans
    .filter((p) => p.type === "LIVE")
    .slice(0, MAX_SIDEBAR_PLANS)
    .map((p) => ({
      name: p.name,
      amountCents: p.amountCents,
      currency: p.currency,
      validityDays: p.validityDays ?? undefined,
      maxReservations: p.maxReservations ?? undefined,
      highlight: false,
    }));
}
