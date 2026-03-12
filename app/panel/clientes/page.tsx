import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { userRepository } from "@/lib/adapters/db";
import { ROLE_LABELS, isAdminRole } from "@/lib/domain";
import { Button } from "@/components/ui/Button";

export default async function PanelClientesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/clientes");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const clients = await userRepository.findManyByCenterId(centerId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Clientes (admin)
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Usuarios con rol en este centro. Hacé clic para ver detalle y órdenes.
      </p>

      {clients.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay usuarios en este centro.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {clients.map((user) => (
            <li
              key={user.id}
              className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)]"
            >
              <Link
                href={`/panel/clientes/${user.id}`}
                className="block font-medium text-[var(--color-primary)] hover:underline"
              >
                {user.email}
              </Link>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {user.name ?? "—"} · {ROLE_LABELS[user.role] ?? user.role}
              </p>
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
