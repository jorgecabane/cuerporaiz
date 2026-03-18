import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRole } from "@/lib/domain/role";
import { googleMeetConfigRepository } from "@/lib/adapters/db";
import { ToggleGoogleMeetForm } from "../toggle-google-meet-form";

export default async function GoogleMeetPluginPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/plugins/meet");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const centerId = session.user.centerId as string;
  const meetStatus = await googleMeetConfigRepository.findStatusByCenterId(centerId);
  const hasOAuthEnv = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
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
        <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[#00897B] flex items-center justify-center">
          <span className="text-white font-bold">GM</span>
        </div>
        <div>
          <h1 className="font-display text-section text-[var(--color-primary)]">
            Google Meet
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Integrá Google Meet para generar links de videollamada en clases online.
          </p>
        </div>
      </div>

      {sp.success === "connected" && (
        <div className="mb-6 rounded-[var(--radius-md)] bg-[var(--color-success-bg,#dcfce7)] p-3 text-sm text-[var(--color-success,#16a34a)]">
          Google Meet conectado correctamente.
        </div>
      )}
      {sp.error && (
        <div className="mb-6 rounded-[var(--radius-md)] bg-[var(--color-error-bg,#fef2f2)] p-3 text-sm text-[var(--color-error,#dc2626)]">
          {sp.error === "oauth_invalid" && "Autorización inválida o cancelada."}
          {sp.error === "meet_not_configured" && "Google Meet no está configurado en el servidor (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)."}
          {sp.error === "oauth_exchange_failed" && "No se pudo completar la conexión. Intentá de nuevo."}
          {sp.error === "no-config" && "Primero conecta tu cuenta de Google."}
          {!["oauth_invalid", "meet_not_configured", "oauth_exchange_failed", "no-config"].includes(sp.error) && `Error: ${sp.error}`}
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] space-y-6">
        {meetStatus === null ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Conecta tu cuenta de Google para generar links de Meet automáticamente al marcar una clase como online en Horarios (se usa Google Calendar).
            </p>
            {hasOAuthEnv ? (
              <a
                href="/api/admin/google-meet/oauth"
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[#00897B] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#006b65] transition-colors"
              >
                Conectar con Google
              </a>
            ) : (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-alt,#f9fafb)] p-4 text-sm text-[var(--color-text-muted)]">
                OAuth no disponible. Contactá al administrador para configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. Ver la sección &quot;Cómo obtener credenciales&quot; más abajo.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text)] mb-2">Estado</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <ToggleGoogleMeetForm centerId={centerId} enabled={meetStatus.enabled} />
                <span className="text-sm text-[var(--color-text-muted)]">
                  {meetStatus.enabled ? "Activo" : "Desactivado"}
                  {!meetStatus.hasCredentials && " (sin credenciales)"}
                </span>
              </div>
            </div>

            {hasOAuthEnv && (
              <div>
                <h2 className="text-sm font-medium text-[var(--color-text)] mb-2">Cuenta conectada</h2>
                <a
                  href="/api/admin/google-meet/oauth"
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Reconectar con Google
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
