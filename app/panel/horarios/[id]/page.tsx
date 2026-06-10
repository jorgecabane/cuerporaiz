import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import {
  liveClassRepository,
  disciplineRepository,
  instructorRepository,
  centerRepository,
  liveClassSeriesRepository,
  centerHolidayRepository,
  zoomConfigRepository,
  googleMeetConfigRepository,
} from "@/lib/adapters/db";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";
import type { SeriesInstanceInfo } from "@/lib/application/series-edit";
import { Button } from "@/components/ui/Button";
import { EditClassForm } from "./EditClassForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/horarios");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;

  const { id } = await params;

  const [liveClass, disciplines, instructors, center, zoomStatus, meetStatus] = await Promise.all([
    liveClassRepository.findById(id),
    disciplineRepository.findActiveByCenterId(centerId),
    instructorRepository.findByCenterId(centerId),
    centerRepository.findById(centerId),
    zoomConfigRepository.findStatusByCenterId(centerId),
    googleMeetConfigRepository.findStatusByCenterId(centerId),
  ]);

  const videoProviders = {
    zoom: !!(zoomStatus?.enabled && zoomStatus?.hasCredentials),
    meet: !!(meetStatus?.enabled && meetStatus?.hasCredentials),
  };

  // Si la instancia no existe (o no es del centro), volvemos al listado en vez de
  // 404. Importa además porque una edición de serie puede borrar la instancia que
  // se estaba viendo: tras la mutación, el re-render de esta ruta debe redirigir
  // limpiamente (un notFound acá corrompe la respuesta del server action y deja la
  // navegación colgada).
  if (!liveClass || liveClass.centerId !== centerId) redirect("/panel/horarios");

  const series = liveClass.seriesId
    ? await liveClassSeriesRepository.findById(liveClass.seriesId)
    : null;

  const reservationCount = await liveClassRepository.countConfirmedReservations(id);

  // Datos para el preview client-side de edición de serie (sin server action).
  let seriesInstances: SeriesInstanceInfo[] = [];
  let holidayKeys: string[] = [];
  let seriesTimeZone = "America/Santiago";
  let detachedCount = 0;
  if (series) {
    const now = new Date();
    const [active, holidays, tz, detached] = await Promise.all([
      liveClassRepository.findBySeriesId(series.id),
      centerHolidayRepository.findByCenterId(centerId),
      getCenterTimezone(centerId),
      liveClassRepository.countDetachedBySeriesFromDate(series.id, centerId, now),
    ]);
    const confirmedMap = await liveClassRepository.countConfirmedByLiveClassIds(
      active.map((c) => c.id),
    );
    seriesInstances = active.map((c) => ({
      id: c.id,
      title: c.title,
      startsAt: c.startsAt,
      confirmed: confirmedMap.get(c.id) ?? 0,
    }));
    holidayKeys = holidays.map((h) => h.date.toISOString().slice(0, 10));
    seriesTimeZone = tz;
    detachedCount = detached;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Editar clase
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Modifica los datos de esta clase. {reservationCount > 0 && (
          <span className="font-medium text-[var(--color-warning)]">
            Tiene {reservationCount} reserva{reservationCount !== 1 ? "s" : ""} confirmada{reservationCount !== 1 ? "s" : ""}.
          </span>
        )}
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <EditClassForm
          liveClass={liveClass}
          disciplines={disciplines}
          instructors={instructors}
          series={series}
          seriesInstances={seriesInstances}
          holidayKeys={holidayKeys}
          seriesTimeZone={seriesTimeZone}
          detachedCount={detachedCount}
          defaultDuration={center?.defaultClassDurationMinutes ?? 60}
          videoProviders={videoProviders}
        />
      </div>
      <div className="mt-6 flex gap-3">
        <Button href={`/panel/horarios/${id}/asistencia`} variant="primary">
          Tomar asistencia{reservationCount > 0 ? ` (${reservationCount})` : ""}
        </Button>
        <Button href="/panel/horarios" variant="secondary">
          Volver a horarios
        </Button>
      </div>
    </div>
  );
}
