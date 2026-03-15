import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { instructorRepository } from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import { InstructorList } from "./InstructorList";

export default async function PanelProfesorasPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/profesoras");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const instructors = await instructorRepository.findByCenterId(centerId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-section text-[var(--color-primary)]">
          Profesoras
        </h1>
        <Button href="/panel/profesoras/nueva" variant="primary">
          Agregar profesora
        </Button>
      </div>
      <p className="text-[var(--color-text-muted)] mb-6">
        Gestiona las profesoras de tu centro. Cada clase en el horario tiene una profesora asignada.
      </p>

      {instructors.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay profesoras. Agregá una desde &quot;Agregar profesora&quot;.
          </p>
        </div>
      ) : (
        <InstructorList instructors={instructors} />
      )}

      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
