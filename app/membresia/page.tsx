import { Button } from "@/components/ui/Button";

export default function MembresiaPage() {
  return (
    <div className="mx-auto max-w-6xl px-[var(--space-4)] py-[var(--space-16)] md:px-[var(--space-8)]">
      <h1 className="font-display text-[var(--text-3xl)] font-semibold text-[var(--color-primary)]">
        Membresía
      </h1>
      <p className="mt-[var(--space-4)] text-[var(--text-base)] text-[var(--color-text-muted)]">
        Próximamente: suscripción mensual con contenido nuevo cada mes y acceso
        a todo el material.
      </p>
      <Button href="/" variant="primary" className="mt-[var(--space-8)]">
        Volver al inicio
      </Button>
    </div>
  );
}
