import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { planRepository } from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain/role";
import { Button } from "@/components/ui/Button";
import { DeletePlanForm } from "./DeletePlanForm";

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${cents / 100} ${currency}`;
}

const TYPE_LABELS: Record<string, string> = {
  LIVE: "Live",
  ON_DEMAND: "On-demand",
  MEMBERSHIP_ON_DEMAND: "Membresía on-demand",
};

export default async function PanelPlanesPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/planes");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const plans = await planRepository.findManyByCenterId(centerId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-section text-[var(--color-primary)]">
          Planes (admin)
        </h1>
        <Button href="/panel/planes/nuevo" variant="primary">
          Nuevo plan
        </Button>
      </div>
      <p className="text-[var(--color-text-muted)] mb-6">
        Gestiona los planes de pago de este centro (packs y membresías).
      </p>

      {plans.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No hay planes. Crea uno desde &quot;Nuevo plan&quot;.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <h2 className="font-semibold text-[var(--color-text)]">
                  {plan.name}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {TYPE_LABELS[plan.type] ?? plan.type} · {plan.slug} ·{" "}
                  {formatPrice(plan.amountCents, plan.currency)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  href={`/panel/planes/${plan.id}/editar`}
                  variant="secondary"
                >
                  Editar
                </Button>
                <DeletePlanForm planId={plan.id} planName={plan.name} />
              </div>
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
