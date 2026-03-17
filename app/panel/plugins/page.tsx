import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRole } from "@/lib/domain/role";
import { mercadopagoConfigRepository, centerRepository, zoomConfigRepository, googleMeetConfigRepository } from "@/lib/adapters/db";

interface PluginCard {
  slug: string;
  name: string;
  description: string;
  category: string;
  active: boolean;
  iconBg: string;
  iconText: string;
}

export default async function PanelPluginsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/plugins");
  if (!isAdminRole(session.user.role)) redirect("/panel");

  const centerId = session.user.centerId as string;
  const [mpStatus, center, zoomStatus, meetStatus] = await Promise.all([
    mercadopagoConfigRepository.findStatusByCenterId(centerId),
    centerRepository.findById(centerId),
    zoomConfigRepository.findStatusByCenterId(centerId),
    googleMeetConfigRepository.findStatusByCenterId(centerId),
  ]);
  const sp = await searchParams;

  const plugins: PluginCard[] = [
    {
      slug: "mercadopago",
      name: "MercadoPago",
      description: "Cobrá online con tarjeta, débito y más medios de pago.",
      category: "Pagos",
      active: mpStatus?.enabled ?? false,
      iconBg: "bg-[#009ee3]",
      iconText: "MP",
    },
    {
      slug: "transferencia",
      name: "Transferencia bancaria",
      description: "Recibí pagos por transferencia mostrando tus datos bancarios.",
      category: "Pagos",
      active: center?.bankTransferEnabled ?? false,
      iconBg: "bg-[#2D3B2A]",
      iconText: "TB",
    },
    {
      slug: "zoom",
      name: "Zoom",
      description: "Generá links de Zoom automáticamente para clases online.",
      category: "Videoconferencia",
      active: (zoomStatus?.enabled && zoomStatus?.hasCredentials) ?? false,
      iconBg: "bg-[#2D8CFF]",
      iconText: "ZM",
    },
    {
      slug: "meet",
      name: "Google Meet",
      description: "Integrá Google Meet para clases online.",
      category: "Videoconferencia",
      active: (meetStatus?.enabled && meetStatus?.hasCredentials) ?? false,
      iconBg: "bg-[#00897B]",
      iconText: "GM",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-section text-[var(--color-primary)] mb-2">
        Plugins
      </h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        Activá y configurá integraciones para tu centro.
      </p>

      {sp.success === "mp_connected" && (
        <div className="mb-6 rounded-[var(--radius-md)] bg-[var(--color-success-bg,#dcfce7)] p-3 text-sm text-[var(--color-success,#16a34a)]">
          MercadoPago conectado exitosamente.
        </div>
      )}
      {sp.success === "connected" && (
        <div className="mb-6 rounded-[var(--radius-md)] bg-[var(--color-success-bg,#dcfce7)] p-3 text-sm text-[var(--color-success,#16a34a)]">
          Plugin conectado correctamente.
        </div>
      )}
      {sp.error && (
        <div className="mb-6 rounded-[var(--radius-md)] bg-[var(--color-error-bg,#fef2f2)] p-3 text-sm text-[var(--color-error,#dc2626)]">
          Error: {sp.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {plugins.map((p) => {
          const isComingSoon = p.slug === "#";
          const cardClass = `group relative rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] border border-transparent transition-all ${
            isComingSoon
              ? "opacity-50 cursor-not-allowed"
              : "hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary-light)] cursor-pointer"
          }`;
          const inner = (
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 w-11 h-11 rounded-[var(--radius-md)] ${p.iconBg} flex items-center justify-center`}
              >
                <span className="text-white text-sm font-bold">{p.iconText}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-medium text-[var(--color-text)]">{p.name}</h2>
                  {p.active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-success-bg,#dcfce7)] text-[var(--color-success,#16a34a)] font-medium">
                      Activo
                    </span>
                  )}
                  {isComingSoon && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface-alt,#f3f4f6)] text-[var(--color-text-muted)] font-medium">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-muted)] leading-snug">
                  {p.description}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-2">{p.category}</p>
              </div>
            </div>
          );

          if (isComingSoon) {
            return <div key={p.name} className={cardClass}>{inner}</div>;
          }
          return (
            <Link key={p.name} href={`/panel/plugins/${p.slug}`} className={cardClass}>
              {inner}
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
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
