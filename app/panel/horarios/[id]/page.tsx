import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import {
  liveClassRepository,
  disciplineRepository,
  instructorRepository,
  centerRepository,
  liveClassSeriesRepository,
  zoomConfigRepository,
  googleMeetConfigRepository,
} from "@/lib/adapters/db";
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

  if (!liveClass || liveClass.centerId !== centerId) notFound();

  const series = liveClass.seriesId
    ? await liveClassSeriesRepository.findById(liveClass.seriesId)
    : null;

  const reservationCount = await liveClassRepository.countConfirmedReservations(id);

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
