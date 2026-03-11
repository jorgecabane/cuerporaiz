import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PlanFormCreate } from "./PlanFormCreate";

export default async function PanelPlanesNuevoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/planes/nuevo");
  if (session.user.role !== "ADMINISTRADORA") redirect("/panel");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Nuevo plan
      </h1>
      <p className="text-[var(--color-text-muted)] mb-6">
        Creá un plan de pago (pack o membresía) para este centro.
      </p>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
        <PlanFormCreate slugError={error === "slug"} />
      </div>
      <div className="mt-6">
        <Button href="/panel/planes" variant="secondary">
          Volver a planes
        </Button>
      </div>
    </div>
  );
}
