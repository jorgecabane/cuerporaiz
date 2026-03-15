import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import { Button } from "@/components/ui/Button";
import { InstructorForm } from "../InstructorForm";

export default async function NuevaProfesoraPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/profesoras/nueva");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Agregar profesora
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Agregá una profesora a tu centro. Si ya tiene cuenta, se le asignará el rol.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <InstructorForm />
      </div>
      <div className="mt-6">
        <Button href="/panel/profesoras" variant="secondary">
          Volver a profesoras
        </Button>
      </div>
    </div>
  );
}
