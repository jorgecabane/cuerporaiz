import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRole } from "@/lib/domain/role";
import { centerRepository } from "@/lib/adapters/db";
import { PoliticasForm } from "./PoliticasForm";
import { Button } from "@/components/ui/Button";

export default async function PanelPoliticasPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/politicas");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const centerId = session.user.centerId as string;
  const center = await centerRepository.findById(centerId);
  if (!center) redirect("/panel");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-6">
        Configuración del centro
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Configurá las políticas de reserva, no-show, y las preferencias del calendario.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <PoliticasForm center={center} />
      </div>
      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
