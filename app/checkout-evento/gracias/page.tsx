import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { eventRepository, eventTicketRepository } from "@/lib/adapters/db";
import { auth } from "@/auth";

type Result = "success" | "failure" | "pending";

const MESSAGES: Record<
  Result,
  { title: string; body: string; icon: typeof CheckCircle; iconClassName: string }
> = {
  success: {
    title: "¡Pago aprobado!",
    body: "Tu compra fue procesada correctamente. Recibirás la confirmación por email.",
    icon: CheckCircle,
    iconClassName: "text-[var(--color-success)]",
  },
  failure: {
    title: "Pago no realizado",
    body: "El pago fue rechazado o cancelado. Puedes intentarlo de nuevo desde el evento cuando quieras.",
    icon: XCircle,
    iconClassName: "text-[var(--color-error)]",
  },
  pending: {
    title: "Pago pendiente",
    body: "Recibimos tu pago, esperamos la confirmación de Mercado Pago. Te llegará un correo cuando se apruebe.",
    icon: Clock,
    iconClassName: "text-[var(--color-text-muted)]",
  },
};

export default async function CheckoutEventoGraciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const result = (params.result as Result) ?? "success";
  const ticketId = params.ticketId;
  const { title, body, icon: Icon, iconClassName } = MESSAGES[result] ?? MESSAGES.success;

  let summary: { eventTitle: string; eventId: string; quantity: number } | null = null;
  if (ticketId) {
    const session = await auth();
    const ticket = await eventTicketRepository.findById(ticketId);
    // Solo mostramos detalles si el ticket pertenece al usuario logueado.
    if (ticket && session?.user?.id === ticket.userId) {
      const event = await eventRepository.findById(ticket.eventId);
      if (event) {
        summary = {
          eventTitle: event.title,
          eventId: event.id,
          quantity: ticket.quantity,
        };
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
          <Icon className={`size-10 md:size-12 ${iconClassName}`} aria-hidden />
          <h1 className={titleClassName}>{title}</h1>
          <p className="max-w-md text-[var(--color-text-muted)]">{body}</p>

          {summary && (
            <div
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-4)] text-left"
              role="region"
              aria-label="Resumen de la entrada"
            >
              <p className="font-medium text-[var(--color-text)]">{summary.eventTitle}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {summary.quantity === 1
                  ? "1 cupo reservado"
                  : `${summary.quantity} cupos reservados`}
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-[var(--space-4)]">
            {result === "success" && (
              <>
                {summary && (
                  <Button href={`/panel/eventos/${summary.eventId}`} variant="primary">
                    Ver el evento
                  </Button>
                )}
                <Button href="/panel/mis-pagos" variant="secondary">
                  Mis pagos
                </Button>
                <Button href="/panel" variant="ghost">
                  Ir al panel
                </Button>
              </>
            )}
            {result === "failure" && (
              <>
                {summary && (
                  <Button href={`/panel/eventos/${summary.eventId}`} variant="primary">
                    Volver al evento
                  </Button>
                )}
                <Button href="/panel" variant="secondary">
                  Ir al panel
                </Button>
              </>
            )}
            {result === "pending" && (
              <>
                <Button href="/panel" variant="primary">
                  Ir al panel
                </Button>
                {summary && (
                  <Button href={`/panel/eventos/${summary.eventId}`} variant="secondary">
                    Ver el evento
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
