import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { planRepository } from "@/lib/adapters/db";
import { Button } from "@/components/ui/Button";
import { PlanFormEdit } from "./PlanFormEdit";

export default async function PanelPlanesEditarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/planes");
  if (session.user.role !== "ADMINISTRADORA") redirect("/panel");
  const centerId = session.user.centerId as string;
  const { id } = await params;
  const { error } = await searchParams;
  const plan = await planRepository.findById(id);
  if (!plan || plan.centerId !== centerId) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Editar plan
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Modificá los datos del plan.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <PlanFormEdit plan={plan} slugError={error === "slug"} />
      </div>
      <div className="mt-6">
        <Button href="/panel/planes" variant="secondary">
          Volver a planes
        </Button>
      </div>
    </div>
  );
}
