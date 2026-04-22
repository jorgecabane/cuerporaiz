import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { planRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";
import { Button } from "@/components/ui/Button";
import { PlanesSortableList } from "./PlanesSortableList";
import { ArchivedPlansList } from "./ArchivedPlansList";
import { PlanesPageErrorBanner } from "./PlanesPageErrorBanner";

export default async function PanelPlanesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/planes");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const all = await planRepository.findManyByCenterId(centerId, { includeArchived: true });
  const active = all.filter((p) => p.archivedAt == null);
  const archived = all.filter((p) => p.archivedAt != null);

  const activeRows = active.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    type: p.type,
    amountCents: p.amountCents,
    currency: p.currency,
    isPopular: p.isPopular,
  }));
  const archivedRows = archived.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    archivedAt: p.archivedAt!.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <PlanesPageErrorBanner />
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-section text-[var(--color-primary)]">
          Planes (admin)
        </h1>
        <Button href="/panel/planes/nuevo" variant="primary">
          Nuevo plan
        </Button>
      </div>
      <p className="text-[var(--color-text-muted)] mb-6">
        Gestiona los planes de pago de este centro. Arrastra para reordenarlos en la tienda.
      </p>

      {activeRows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay planes. Crea uno desde &quot;Nuevo plan&quot;.
          </p>
        </div>
      ) : (
        <PlanesSortableList initialPlans={activeRows} />
      )}

      <ArchivedPlansList plans={archivedRows} />

      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
