import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { centerRepository } from "@/lib/adapters/db";
import { ROLE_LABELS, isAdminRole } from "@/lib/domain";
import { PANEL_NAV_ITEMS, PANEL_ADMIN_ITEMS } from "@/lib/panel-nav";
import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const QUICK_ACTION_META: Record<
  string,
  { description: string; Icon: typeof Calendar }
> = {
  "/panel/reservas": {
    description: "Ver agenda y tus reservas",
    Icon: Calendar,
  },
  "/planes": {
    description: "Ver planes y membresías",
    Icon: CreditCard,
  },
  "/panel/planes": {
    description: "Gestionar planes del centro",
    Icon: LayoutDashboard,
  },
};

export const metadata = {
  title: "Mi cuenta | Cuerpo Raíz",
  description: "Tu espacio en Cuerpo Raíz. Clases, reservas y planes.",
};

export default async function PanelPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/panel");
  }
  const { user } = session;
  const centerId = user.centerId as string;
  const center = await centerRepository.findById(centerId);
  const centerName = center?.name ?? centerId;
  const roleLabel = ROLE_LABELS[user.role];
  const admin = isAdminRole(user.role);

  return (
    <div className="mx-auto max-w-3xl px-1 sm:px-0">
      {/* Welcome */}
      <section className="mb-6 md:mb-8">
        <h1 className="font-display text-section text-[var(--color-primary)] mb-1">
          Mi cuenta
        </h1>
        <p className="text-[var(--color-text-muted)] text-lg">
          {user.name
            ? `Hola, ${user.name}.`
            : "Hola."}{" "}
          Aquí puedes ver tus reservas, planes y acceder a tu contenido.
        </p>
      </section>

      {/* Resumen útil — placeholder hasta tener datos (próxima clase, plan activo, cupos) */}
      <section
        className="rounded-[var(--radius-xl)] border border-[var(--color-border)] border-dashed bg-[var(--color-surface)] p-5 md:p-6 mb-8"
        aria-labelledby="resumen-heading"
      >
        <h2
          id="resumen-heading"
          className="font-display text-lg font-semibold text-[var(--color-primary)] mb-2 flex items-center gap-2"
        >
          <Sparkles className="h-5 w-5 text-[var(--color-secondary)]" aria-hidden />
          Tu resumen
        </h2>
        <p className="text-[var(--color-text-muted)] text-sm md:text-base leading-relaxed">
          Cuando tengas clases reservadas o un plan activo, aquí verás tu próxima clase y tus cupos restantes.
        </p>
      </section>

      {/* Tu perfil — card con jerarquía clara */}
      <section
        className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 shadow-[var(--shadow-md)] mb-8 border-t-4 border-t-[var(--color-primary)]"
        aria-labelledby="profile-heading"
      >
        <h2
          id="profile-heading"
          className="font-display text-lg font-semibold text-[var(--color-primary)] mb-4"
        >
          Tu perfil
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-[var(--color-text-muted)]">
              Email
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--color-text)]">
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-text-muted)]">
              Nombre
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--color-text)]">
              {user.name ?? "No configurado"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-text-muted)]">
              Rol en este centro
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--color-text)]">
              {roleLabel}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-text-muted)]">
              Centro
            </dt>
            <dd className="mt-0.5 font-medium text-[var(--color-text)]">
              {centerName}
            </dd>
          </div>
        </dl>
      </section>

      {/* Acciones rápidas — separación visual y touch targets móvil (C.8, C.11) */}
      <section
        aria-labelledby="actions-heading"
        className="pt-2 border-t border-[var(--color-border)]"
      >
        <h2
          id="actions-heading"
          className="font-display text-lg font-semibold text-[var(--color-primary)] mb-4 mt-2"
        >
          Acciones rápidas
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PANEL_NAV_ITEMS.filter((item) => item.href !== "/panel").map(
            (item) => {
              const meta = QUICK_ACTION_META[item.href];
              if (!meta) return null;
              const { Icon } = meta;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-[3.5rem] cursor-pointer items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 py-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 sm:min-h-0 sm:py-4"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-[var(--color-text)] block">
                        {item.label}
                      </span>
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {meta.description}
                      </span>
                    </span>
                    <ArrowRight
                      className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            }
          )}
          {admin && (() => {
            const item = PANEL_ADMIN_ITEMS.find((i) => i.href === "/panel/planes");
            if (!item) return null;
            const meta = QUICK_ACTION_META[item.href];
            if (!meta) return null;
            const { Icon } = meta;
            return (
              <li key={item.href} className="sm:col-span-2">
                <Link
                  href={item.href}
                  className="flex min-h-[3.5rem] cursor-pointer items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 py-5 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-[var(--color-secondary)] hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] focus:ring-offset-2 sm:min-h-0 sm:py-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-secondary-light)] text-[var(--color-secondary)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-[var(--color-text)] block">
                      Administración · {item.label}
                    </span>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {meta.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })()}
        </ul>
      </section>
    </div>
  );
}
