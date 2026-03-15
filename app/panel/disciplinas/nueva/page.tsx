import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { Button } from "@/components/ui/Button";
import { DisciplineForm } from "../DisciplineForm";

export default async function NuevaDisciplinaPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/disciplinas/nueva");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Nueva disciplina
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Creá una práctica nueva para tu centro.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <DisciplineForm />
      </div>
      <div className="mt-6">
        <Button href="/panel/disciplinas" variant="secondary">
          Volver a disciplinas
        </Button>
      </div>
    </div>
  );
}
