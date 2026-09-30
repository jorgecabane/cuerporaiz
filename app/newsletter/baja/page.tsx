import type { Metadata } from "next";
import Link from "next/link";
import { centerRepository } from "@/lib/adapters/db";
import { verifyNewsletterToken } from "@/lib/application/newsletter-token";
import { confirmUnsubscribe, resubscribe } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Novedades del blog",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ e?: string; t?: string; estado?: string }> };

const BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-[var(--space-6)] text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

export default async function NewsletterUnsubscribePage({ searchParams }: Props) {
  const { e: email = "", t: token = "", estado } = await searchParams;
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  const center = slug ? await centerRepository.findBySlug(slug) : null;
  const valid = Boolean(center && email && token && verifyNewsletterToken(center.id, email, token));

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-[var(--space-4)] pt-[var(--header-height)]">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-[var(--space-8)] text-center shadow-[var(--shadow-md)]">
        {!valid || estado === "invalido" ? (
          <>
            <h1 className="font-display text-3xl font-semibold text-[var(--color-primary)]">Link no válido</h1>
            <p className="mt-[var(--space-3)] text-[var(--color-text-muted)]">
              Este link para darte de baja no es válido o está incompleto. Usa el link del último correo que recibiste.
            </p>
            <Link href="/" className={`${BUTTON} mt-[var(--space-6)] border border-[var(--color-border)] text-[var(--color-text-muted)]`}>
              Ir al inicio
            </Link>
          </>
        ) : estado === "baja" ? (
          <>
            <p className="text-3xl" aria-hidden>✓</p>
            <h1 className="mt-[var(--space-2)] font-display text-3xl font-semibold text-[var(--color-primary)]">
              Listo, ya no recibirás novedades del blog
            </h1>
            <p className="mt-[var(--space-3)] text-[var(--color-text-muted)]">
              Seguirás recibiendo los correos de tus reservas y compras.
            </p>
            <form action={resubscribe} className="mt-[var(--space-6)]">
              <input type="hidden" name="e" value={email} />
              <input type="hidden" name="t" value={token} />
              <button type="submit" className={`${BUTTON} border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]`}>
                Me equivoqué, volver a suscribirme
              </button>
            </form>
          </>
        ) : estado === "suscrito" ? (
          <>
            <p className="text-3xl" aria-hidden>✓</p>
            <h1 className="mt-[var(--space-2)] font-display text-3xl font-semibold text-[var(--color-primary)]">
              ¡Bienvenido de vuelta!
            </h1>
            <p className="mt-[var(--space-3)] text-[var(--color-text-muted)]">Te avisaremos cuando publiquemos un artículo nuevo.</p>
            <Link href="/blog" className={`${BUTTON} mt-[var(--space-6)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`}>
              Ir al blog
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold text-[var(--color-primary)]">¿Dejar de recibir novedades del blog?</h1>
            <p className="mt-[var(--space-3)] break-words text-[var(--color-text-muted)]">
              Dejaremos de enviar los artículos nuevos a <strong className="text-[var(--color-text)]">{email}</strong>.
            </p>
            <form action={confirmUnsubscribe} className="mt-[var(--space-6)]">
              <input type="hidden" name="e" value={email} />
              <input type="hidden" name="t" value={token} />
              <button type="submit" className={`${BUTTON} bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`}>
                Darme de baja
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
