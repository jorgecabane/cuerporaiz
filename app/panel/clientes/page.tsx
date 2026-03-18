import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain";
import { Button } from "@/components/ui/Button";
import { ClientsListInfinite } from "./ClientsListInfinite";

export default async function PanelClientesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/clientes");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-section text-[var(--color-primary)] mb-1">
            Estudiantes
          </h1>
        </div>
        <Button href="/panel/clientes/nueva" variant="primary">
          + Agregar estudiante
        </Button>
      </div>

      <ClientsListInfinite pageSize={25} />

      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
