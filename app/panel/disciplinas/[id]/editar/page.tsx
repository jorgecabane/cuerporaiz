import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { disciplineRepository } from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import { DisciplineForm } from "../../DisciplineForm";

export default async function EditarDisciplinaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/disciplinas");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const { id } = await params;
  const discipline = await disciplineRepository.findById(id);
  if (!discipline || discipline.centerId !== session.user.centerId) redirect("/panel/disciplinas");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Editar disciplina
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Modifica el nombre, color o estado de esta disciplina.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <DisciplineForm discipline={discipline} />
      </div>
      <div className="mt-6">
        <Button href="/panel/disciplinas" variant="secondary">
          Volver a disciplinas
        </Button>
      </div>
    </div>
  );
}
