import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRole } from "@/lib/domain/role";
import { mercadopagoConfigRepository } from "@/lib/adapters/db";
import { ToggleMercadoPagoForm } from "./toggle-mercadopago-form";

export default async function PanelPluginsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/panel/plugins");
  }
  if (!isAdminRole(session.user.role)) {
    redirect("/panel");
  }

  const centerId = session.user.centerId;
  const mpStatus = await mercadopagoConfigRepository.findStatusByCenterId(centerId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-6">
        Plugins del centro
      </h1>
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] space-y-6">
        <section>
          <h2 className="text-lg font-medium text-[var(--color-text)] mb-2">
            MercadoPago (checkout y pagos)
          </h2>
          {mpStatus === null ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              MercadoPago no está configurado para este centro. Añade credenciales (access token y
              webhook secret) en la base de datos o mediante seed para poder activar el plugin.
            </p>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <ToggleMercadoPagoForm centerId={centerId} enabled={mpStatus.enabled} />
              <span className="text-sm text-[var(--color-text-muted)]">
                {mpStatus.enabled ? "Plugin activo" : "Plugin desactivado"}
                {!mpStatus.hasCredentials && " (sin credenciales configuradas)"}
              </span>
            </div>
          )}
        </section>

        <p className="text-sm text-[var(--color-text-muted)]">
          Otros plugins (Zoom, Meet, Vimeo, etc.) se añadirán en futuras iteraciones.
        </p>

        <Link
          href="/panel"
          className="inline-block rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-light)]"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
