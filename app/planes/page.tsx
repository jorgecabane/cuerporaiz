import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Plan } from "@/lib/ports";
import { planRepository } from "@/lib/adapters/db";
import { ComprarPlanButton } from "./ComprarPlanButton";

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${cents / 100} ${currency}`;
}

export default async function PlanesPage() {
  const session = await auth();
  if (!session?.user?.centerId) {
    redirect("/auth/login?callbackUrl=/planes");
  }
  const plans = await planRepository.findManyByCenterId(session.user.centerId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Planes
      </h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        Elegí un plan y pagá con MercadoPago de forma segura.
      </p>

      {plans.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-text-muted)]">
            Este centro aún no tiene planes publicados.
          </p>
          <Button href="/panel" variant="secondary" className="mt-4">
            Volver al panel
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {plans.map((plan: Plan) => (
            <li
              key={plan.id}
              className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <h2 className="font-semibold text-[var(--color-text)]">{plan.name}</h2>
                {plan.description && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {plan.description}
                  </p>
                )}
                <p className="mt-2 font-medium text-[var(--color-primary)]">
                  {formatPrice(plan.amountCents, plan.currency)}
                </p>
              </div>
              <Suspense fallback={<Button disabled>...</Button>}>
                <ComprarPlanButton planId={plan.id} planName={plan.name} />
              </Suspense>
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
