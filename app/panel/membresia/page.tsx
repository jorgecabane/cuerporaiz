import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { subscriptionRepository, planRepository } from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import { CancelMembresiaForm } from "./CancelMembresiaForm";
import { PauseMembresiaForm } from "./PauseMembresiaForm";

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente de autorización",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  CANCELLED: "Cancelada",
  PAST_DUE: "Pago pendiente",
};

export default async function PanelMembresiaPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/membresia");
  const centerId = session.user.centerId as string;
  const subscription = await subscriptionRepository.findActiveByUserAndCenter(session.user.id, centerId);
  const plan = subscription ? await planRepository.findById(subscription.planId) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Mi membresía
      </h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        Estado de tu suscripción y acceso a la videoteca.
      </p>

      {!subscription ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            No tenés una membresía activa. Suscribite desde Planes para acceder a la videoteca.
          </p>
          <Button href="/planes" variant="primary" className="mt-4">
            Ver planes
          </Button>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] space-y-6">
          <dl className="grid gap-2">
            <div>
              <dt className="text-sm text-[var(--color-text-muted)]">Plan</dt>
              <dd className="font-medium">{plan?.name ?? subscription.planId}</dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--color-text-muted)]">Estado</dt>
              <dd className="font-medium">{STATUS_LABELS[subscription.status] ?? subscription.status}</dd>
            </div>
            {subscription.currentPeriodEnd && (
              <div>
                <dt className="text-sm text-[var(--color-text-muted)]">Próximo cobro / vigencia</dt>
                <dd className="font-medium">{formatDate(subscription.currentPeriodEnd)}</dd>
              </div>
            )}
            {subscription.pausedUntil && subscription.status === "PAUSED" && (
              <div>
                <dt className="text-sm text-[var(--color-text-muted)]">Pausada hasta</dt>
                <dd className="font-medium">{formatDate(subscription.pausedUntil)}</dd>
              </div>
            )}
          </dl>

          {subscription.status === "ACTIVE" && subscription.mpPreapprovalId && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--color-border)]">
              <PauseMembresiaForm subscriptionId={subscription.id} />
              <CancelMembresiaForm subscriptionId={subscription.id} />
            </div>
          )}

          {subscription.status === "PAUSED" && (
            <p className="text-sm text-[var(--color-text-muted)]">
              Tu membresía está pausada. El acceso continúa hasta la fecha indicada; después podés reanudar o cancelar desde MercadoPago.
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <Button href="/panel" variant="secondary">
          Volver al panel
        </Button>
      </div>
    </div>
  );
}
