import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminRole } from "@/lib/domain/role";
import Link from "next/link";
import { EventForm } from "./EventForm";

export default async function NuevoEventoPage() {
  const session = await auth();
  if (!session?.user?.centerId || !isAdminRole(session.user.role)) redirect("/panel");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6">
        <Link
          href="/panel/eventos"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          ← Volver a Eventos
        </Link>
      </div>

      <h1 className="font-display text-2xl font-bold text-[var(--color-primary)] mb-2">
        Nuevo evento
      </h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        Completa los datos para crear un nuevo evento.
      </p>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <EventForm mode="create" />
      </div>
    </div>
  );
}
