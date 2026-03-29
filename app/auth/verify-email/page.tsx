import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyEmail } from "@/lib/application/verify-email";
import { authTokenRepository } from "@/lib/adapters/db";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-md)]">
          <h1 className="font-display text-section text-[var(--color-primary)] mb-[var(--space-6)]">
            Enlace inválido
          </h1>
          <p className="text-sm text-[var(--color-text)]">
            No se proporcionó un token de verificación.
          </p>
          <p className="mt-[var(--space-5)] text-center text-sm text-[var(--color-text-muted)]">
            <Link href="/panel" className="text-[var(--color-secondary)] hover:underline">
              Ir al panel
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const result = await verifyEmail(token, authTokenRepository);

  if (result.success) {
    redirect("/panel?verified=1");
  }

  if (result.code === "EXPIRED_TOKEN") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-md)]">
          <h1 className="font-display text-section text-[var(--color-primary)] mb-[var(--space-6)]">
            Enlace expirado
          </h1>
          <p className="text-sm text-[var(--color-text)]">
            El enlace de verificación expiró.
          </p>
          <p className="mt-[var(--space-5)] text-center text-sm text-[var(--color-text-muted)]">
            <Link href="/panel" className="text-[var(--color-secondary)] hover:underline">
              Solicitar nuevo enlace
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // INVALID_TOKEN
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-8)] shadow-[var(--shadow-md)]">
        <h1 className="font-display text-section text-[var(--color-primary)] mb-[var(--space-6)]">
          Enlace inválido
        </h1>
        <p className="text-sm text-[var(--color-text)]">
          El enlace es inválido o ya fue usado.
        </p>
        <p className="mt-[var(--space-5)] text-center text-sm text-[var(--color-text-muted)]">
          <Link href="/panel" className="text-[var(--color-secondary)] hover:underline">
            Reenviar email de verificación
          </Link>
        </p>
      </div>
    </div>
  );
}
