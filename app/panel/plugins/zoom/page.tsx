import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRole } from "@/lib/domain/role";
import { zoomConfigRepository } from "@/lib/adapters/db";
import { ToggleZoomForm } from "../toggle-zoom-form";

export default async function ZoomPluginPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/plugins/zoom");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const centerId = session.user.centerId as string;
  const zoomStatus = await zoomConfigRepository.findStatusByCenterId(centerId);
  const hasOAuthEnv = !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET);
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/panel/plugins"
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-4 inline-block"
      >
        &larr; Plugins
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[#2D8CFF] flex items-center justify-center">
          <span className="text-white font-bold">ZM</span>
        </div>
        <div>
          <h1 className="font-display text-section text-[var(--color-primary)]">
            Zoom
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Generá links de videollamada automáticamente para clases online.
          </p>
        </div>
      </div>

      {sp.success === "connected" && (
        <div className="mb-6 rounded-[var(--radius-md)] bg-[var(--color-success-bg,#dcfce7)] p-3 text-sm text-[var(--color-success,#16a34a)]">
          Zoom conectado correctamente.
        </div>
      )}
      {sp.error && (
        <div className="mb-6 rounded-[var(--radius-md)] bg-[var(--color-error-bg,#fef2f2)] p-3 text-sm text-[var(--color-error,#dc2626)]">
          {sp.error === "oauth_invalid" && "Autorización inválida o cancelada."}
          {sp.error === "zoom_not_configured" && "Zoom no está configurado en el servidor (ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET)."}
          {sp.error === "oauth_exchange_failed" && "No se pudo completar la conexión. Intentá de nuevo."}
          {sp.error === "no-config" && "Primero conectá tu cuenta de Zoom."}
          {!["oauth_invalid", "zoom_not_configured", "oauth_exchange_failed", "no-config"].includes(sp.error) && `Error: ${sp.error}`}
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] space-y-6">
        {zoomStatus === null ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Conectá tu cuenta de Zoom para generar links de videollamada automáticamente al marcar una clase como online en Horarios.
            </p>
            {hasOAuthEnv ? (
              <a
                href="/api/admin/zoom/oauth"
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[#2D8CFF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a6fd6] transition-colors"
              >
                Conectar mi cuenta de Zoom
              </a>
            ) : (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-alt,#f9fafb)] p-4 text-sm text-[var(--color-text-muted)]">
                OAuth no disponible. Contactá al administrador de la plataforma para configurar las credenciales (ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET). Ver la sección &quot;Cómo obtener credenciales&quot; más abajo.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text)] mb-2">Estado</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <ToggleZoomForm centerId={centerId} enabled={zoomStatus.enabled} />
                <span className="text-sm text-[var(--color-text-muted)]">
                  {zoomStatus.enabled ? "Activo" : "Desactivado"}
                  {!zoomStatus.hasCredentials && " (sin credenciales)"}
                </span>
              </div>
            </div>

            {hasOAuthEnv && (
              <div>
                <h2 className="text-sm font-medium text-[var(--color-text)] mb-2">Cuenta conectada</h2>
                <a
                  href="/api/admin/zoom/oauth"
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Reconectar cuenta de Zoom
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
