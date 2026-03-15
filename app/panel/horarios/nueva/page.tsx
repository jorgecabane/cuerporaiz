import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { disciplineRepository, instructorRepository, centerRepository } from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import { CreateClassForm } from "./CreateClassForm";

interface Props {
  searchParams: Promise<{ date?: string; hour?: string }>;
}

export default async function NuevaClasePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/horarios/nueva");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;

  const [disciplines, instructors, center] = await Promise.all([
    disciplineRepository.findActiveByCenterId(centerId),
    instructorRepository.findByCenterId(centerId),
    centerRepository.findById(centerId),
  ]);

  const params = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Nueva clase
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Cargá una clase suelta o una serie recurrente para tu centro.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <CreateClassForm
          disciplines={disciplines}
          instructors={instructors}
          defaultDate={params.date}
          defaultHour={params.hour}
          defaultDuration={center?.defaultClassDurationMinutes ?? 60}
        />
      </div>
      <div className="mt-6">
        <Button href="/panel/horarios" variant="secondary">
          Volver a horarios
        </Button>
      </div>
    </div>
  );
}
