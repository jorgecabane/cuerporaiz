import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { orderRepository, planRepository, centerRepository } from "@/lib/adapters/db";

type Result = "success" | "failure" | "pending";

const MESSAGES: Record<
  Result,
  { title: string; body: string; icon: typeof CheckCircle; iconClassName: string }
> = {
  success: {
    title: "¡Pago aprobado!",
    body: "Tu compra fue procesada correctamente. Recibirás la confirmación por email y puedes acceder a tu contenido desde el panel.",
    icon: CheckCircle,
    iconClassName: "text-[var(--color-success)]",
  },
  failure: {
    title: "Pago no realizado",
    body: "El pago fue rechazado o cancelado. Puedes intentarlo de nuevo desde la sección Planes cuando quieras.",
    icon: XCircle,
    iconClassName: "text-[var(--color-error)]",
  },
  pending: {
    title: "Pago pendiente",
    body: "Tu pago está en proceso (por ejemplo, pago en efectivo en un punto de pago). Cuando Mercado Pago lo confirme, actualizaremos tu acceso automáticamente.",
    icon: Clock,
    iconClassName: "text-[var(--color-text-muted)]",
  },
};

export default async function CheckoutGraciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const result = (params.result as Result) ?? "success";
  const orderRef = params.order;
  const { title, body, icon: Icon, iconClassName } = MESSAGES[result] ?? MESSAGES.success;

  let orderSummary: { planName: string; centerName: string } | null = null;
  if (result === "success" && orderRef) {
    const order = await orderRepository.findByExternalReference(orderRef);
    if (order) {
      const [plan, center] = await Promise.all([
        planRepository.findById(order.planId),
        centerRepository.findById(order.centerId),
      ]);
      if (plan && center) {
        orderSummary = { planName: plan.name, centerName: center.name };
      }
    }
  }

  const titleClassName =
    result === "success"
      ? "font-display text-section font-semibold text-[var(--color-success)]"
      : result === "failure"
        ? "font-display text-section font-semibold text-[var(--color-error)]"
        : "font-display text-section font-semibold text-[var(--color-primary)]";

  return (
    <div className="flex flex-1 flex-col bg-[var(--color-tertiary)]">
      <div className="flex flex-1 flex-col items-center justify-center px-[var(--space-4)] py-[var(--space-12)] md:py-[var(--space-16)]">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-[var(--space-6)] text-center">
          <Icon
            className={`size-10 md:size-12 ${iconClassName}`}
            aria-hidden
          />
          <h1 className={titleClassName}>{title}</h1>
          <p className="max-w-md text-[var(--color-text-muted)]">{body}</p>

          {orderSummary && (
            <div
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-4)] text-left"
              role="region"
              aria-label="Resumen de la compra"
            >
              <p className="font-medium text-[var(--color-text)]">
                Compraste: {orderSummary.planName}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Centro: {orderSummary.centerName}
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-[var(--space-4)]">
          {result === "success" && (
            <>
              <Button href="/panel" variant="primary">
                Ir al panel
              </Button>
              <Button href="/panel/tienda" variant="secondary">
                Ver mis planes
              </Button>
              <Button href="/" variant="ghost">
                Inicio
              </Button>
            </>
          )}
          {result === "failure" && (
            <>
              <Button href="/panel/tienda" variant="primary">
                Ver más planes
              </Button>
              <Button href="/panel" variant="secondary">
                Ir al panel
              </Button>
              <Button href="/" variant="ghost">
                Inicio
              </Button>
            </>
          )}
          {result === "pending" && (
            <>
              <Button href="/panel" variant="primary">
                Ir al panel
              </Button>
              <Button href="/panel/tienda" variant="secondary">
                Ver más planes
              </Button>
              <Button href="/" variant="ghost">
                Inicio
              </Button>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
