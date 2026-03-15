import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { disciplineRepository } from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import { DisciplineList } from "./DisciplineList";

export default async function PanelDisciplinasPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/disciplinas");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const disciplines = await disciplineRepository.findManyByCenterId(centerId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-section text-[var(--color-primary)]">
          Disciplinas
        </h1>
        <Button href="/panel/disciplinas/nueva" variant="primary">
          Nueva disciplina
        </Button>
      </div>
      <p className="text-[var(--color-text-muted)] mb-6">
        Gestiona las prácticas de tu centro (Yoga, Pilates, TRX…). Cada clase en el horario tiene una disciplina asignada.
      </p>

      {disciplines.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay disciplinas. Creá una desde &quot;Nueva disciplina&quot;.
          </p>
        </div>
      ) : (
        <DisciplineList disciplines={disciplines} />
      )}

      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
