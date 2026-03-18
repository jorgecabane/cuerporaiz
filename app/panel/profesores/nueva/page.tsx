import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain";
import { Button } from "@/components/ui/Button";
import { InstructorForm } from "../InstructorForm";

export default async function NuevoProfesorPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/profesores/nueva");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Agregar profesor
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Agrega un profesor a tu centro. Si ya tiene cuenta, se le asignará el rol.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <InstructorForm />
      </div>
      <div className="mt-6">
        <Button href="/panel/profesores" variant="secondary">
          Volver a profesores
        </Button>
      </div>
    </div>
  );
}
