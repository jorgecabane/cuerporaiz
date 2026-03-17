import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { userRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain";
import { Button } from "@/components/ui/Button";

const STUDENT_ROLES = new Set(["STUDENT"]);

export default async function PanelClientesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/clientes");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const all = await userRepository.findManyByCenterId(centerId);
  const clients = all.filter((u) => STUDENT_ROLES.has(u.role));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-section text-[var(--color-primary)] mb-1">
            Alumnas
          </h1>
          <p className="text-[var(--color-text-muted)]">
            {clients.length} alumna{clients.length !== 1 ? "s" : ""} en este centro.
          </p>
        </div>
        <Button href="/panel/clientes/nueva" variant="primary">
          + Agregar alumna
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay alumnas registradas en este centro.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {clients.map((user) => (
            <li
              key={user.id}
              className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-shadow"
            >
              <Link
                href={`/panel/clientes/${user.id}`}
                className="block"
              >
                <p className="font-medium text-[var(--color-primary)]">
                  {user.name || user.email}
                </p>
                {user.name && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                    {user.email}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
