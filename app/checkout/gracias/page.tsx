import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Result = "success" | "failure" | "pending";

const MESSAGES: Record<Result, { title: string; body: string }> = {
  success: {
    title: "¡Pago aprobado!",
    body: "Tu compra fue procesada correctamente. Recibirás la confirmación por email y podés acceder a tu contenido desde el panel.",
  },
  failure: {
    title: "Pago no realizado",
    body: "El pago fue rechazado o cancelado. Podés intentar de nuevo desde la sección Planes cuando quieras.",
  },
  pending: {
    title: "Pago pendiente",
    body: "Tu pago está en proceso (por ejemplo, pago en efectivo en un punto de pago). Cuando MercadoPago lo confirme, actualizaremos tu acceso automáticamente.",
  },
};

export default async function CheckoutGraciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const result = (params.result as Result) ?? "success";
  const { title, body } = MESSAGES[result] ?? MESSAGES.success;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-display text-[var(--text-3xl)] font-semibold text-[var(--color-primary)]">
        {title}
      </h1>
      <p className="mt-4 text-[var(--color-text-muted)]">
        {body}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button href="/panel" variant="primary">
          Ir al panel
        </Button>
        <Button href="/planes" variant="secondary">
          Ver más planes
        </Button>
        <Button href="/" variant="ghost">
          Inicio
        </Button>
      </div>
    </div>
  );
}
