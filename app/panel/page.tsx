import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/auth";
import { ROLE_LABELS, isAdminRole } from "@/lib/domain";

export default async function PanelPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/panel");
  }
  const { user } = session;
  const roleLabel = ROLE_LABELS[user.role];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-6">
        Mi cuenta
      </h1>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <dl className="grid gap-3">
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Nombre</dt>
            <dd className="font-medium">{user.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Rol en este centro</dt>
            <dd className="font-medium">{roleLabel}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Centro</dt>
            <dd className="font-medium">{user.centerId}</dd>
          </div>
        </dl>
        <div className="mt-6 flex gap-4 flex-wrap">
          <Link
            href="/panel/reservas"
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Clases y reservas
          </Link>
          <Link
            href="/planes"
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Planes y comprar
          </Link>
          {isAdminRole(user.role) && (
            <>
              <Link
                href="/panel/plugins"
                className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                Plugins
              </Link>
              <Link
                href="/panel/planes"
                className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                Planes (admin)
              </Link>
            </>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-light)]"
            >
              Cerrar sesión
            </button>
          </form>
          <Link
            href="/"
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
