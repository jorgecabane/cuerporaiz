import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRole } from "@/lib/domain/role";
import { mercadopagoConfigRepository } from "@/lib/adapters/db";
import { ToggleMercadoPagoForm } from "../toggle-mercadopago-form";

export default async function MercadoPagoPluginPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/plugins/mercadopago");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const centerId = session.user.centerId;
  const mpStatus = await mercadopagoConfigRepository.findStatusByCenterId(centerId);
  const hasOAuthEnv = !!(process.env.MP_APP_ID && process.env.MP_CLIENT_SECRET);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/panel/plugins"
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-4 inline-block"
      >
        &larr; Plugins
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[#009ee3] flex items-center justify-center">
          <span className="text-white font-bold">MP</span>
        </div>
        <div>
          <h1 className="font-display text-section text-[var(--color-primary)]">
            MercadoPago
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">Checkout y pagos online</p>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] space-y-6">
        {mpStatus === null ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Conectá tu cuenta de MercadoPago para poder cobrar a tus alumnas con tarjeta, débito y otros medios de pago.
            </p>
            {hasOAuthEnv ? (
              <a
                href="/api/admin/mercadopago/oauth"
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[#009ee3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#007eb5] transition-colors"
              >
                Conectar mi cuenta de MercadoPago
              </a>
            ) : (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-alt,#f9fafb)] p-4 text-sm text-[var(--color-text-muted)]">
                OAuth no disponible. Contactá al administrador de la plataforma para configurar las credenciales (MP_APP_ID / MP_CLIENT_SECRET).
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text)] mb-2">Estado</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <ToggleMercadoPagoForm centerId={centerId} enabled={mpStatus.enabled} />
                <span className="text-sm text-[var(--color-text-muted)]">
                  {mpStatus.enabled ? "Activo" : "Desactivado"}
                  {!mpStatus.hasCredentials && " (sin credenciales)"}
                </span>
              </div>
            </div>

            {hasOAuthEnv && (
              <div>
                <h2 className="text-sm font-medium text-[var(--color-text)] mb-2">Cuenta conectada</h2>
                <a
                  href="/api/admin/mercadopago/oauth"
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Reconectar cuenta de MercadoPago
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
