import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { centerRepository, userPlanRepository, planRepository } from "@/lib/adapters/db";
import { prisma } from "@/lib/adapters/db/prisma";
import { canShowTrialCta, listMyReservationsPaginated } from "@/lib/application/reserve-class";
import {
  ArrowRight,
  Banknote,
  Calendar,
  CalendarDays,
  CreditCard,
  Sparkles,
  Users,
} from "lucide-react";
import { PanelHomeMisReservasTrigger } from "./PanelHomeMisReservasTrigger";
import { PanelHomeMisClasesTrigger } from "./PanelHomeMisClasesTrigger";
import { PanelHomeCalendar } from "./PanelHomeCalendar";
import { EmailVerificationBanner } from "@/components/panel/EmailVerificationBanner";
import type { ReservationDto } from "@/lib/dto/reservation-dto";
import type { Role } from "@/lib/domain/role";
import { isAdminRole, isInstructorRole, isStudentRole } from "@/lib/domain";
import { formatMinutesAsShortSpanish } from "@/lib/domain/center-policy";
import type { LucideIcon } from "lucide-react";

type QuickAccessItem =
  | { type: "link"; href: string; label: string; Icon: LucideIcon }
  | { type: "sheet-reservas"; cancelBeforeMinutes: number; cancelPolicyCopy?: string }
  | { type: "sheet-mis-clases" }
  | { type: "disabled"; label: string; Icon: LucideIcon };

function getQuickAccessItems(
  role: Role,
  cancelBeforeMinutes: number,
  cancelPolicyCopy?: string
): QuickAccessItem[] {
  if (isStudentRole(role)) {
    return [
      { type: "sheet-reservas", cancelBeforeMinutes, cancelPolicyCopy },
      { type: "link", href: "/panel/tienda", label: "Planes", Icon: CreditCard },
      { type: "link", href: "/panel/mis-pagos", label: "Mis pagos", Icon: Banknote },
    ];
  }
  if (isInstructorRole(role)) {
    return [
      { type: "sheet-mis-clases" },
      { type: "link", href: "/panel/tienda", label: "Planes", Icon: CreditCard },
      { type: "disabled", label: "Mis pagos", Icon: Banknote },
    ];
  }
  if (isAdminRole(role)) {
    return [
      { type: "link", href: "/panel/horarios", label: "Horarios", Icon: Calendar },
      { type: "link", href: "/panel/clientes", label: "Clientes", Icon: Users },
      { type: "link", href: "/panel/pagos", label: "Pagos", Icon: Banknote },
    ];
  }
  return [];
}

export const metadata = {
  title: "Home | Cuerpo Raíz",
  description: "Tu espacio en Cuerpo Raíz. Clases, reservas y planes.",
};

function isToday(iso: string | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export default async function PanelPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/panel");
  }
  const { user } = session;
  const centerId = user.centerId as string;
  const center = await centerRepository.findById(centerId);
  const showTrialCta =
    isStudentRole(user.role as Role) &&
    (await canShowTrialCta(user.id, centerId));

  const [activePlans, reservationsResult] = await Promise.all([
    userPlanRepository.findActiveByUserAndCenter(user.id, centerId),
    listMyReservationsPaginated(user.id, centerId, { page: 1, pageSize: 100 }),
  ]);
  const firstPlan = activePlans[0];
  const planName = firstPlan
    ? (await planRepository.findById(firstPlan.planId))?.name ?? null
    : null;
  const todayReservations: ReservationDto[] = (reservationsResult.items ?? []).filter(
    (r) => r.status === "CONFIRMED" && r.liveClass?.startsAt && isToday(r.liveClass.startsAt)
  );

  const hasActivePlan = Boolean(planName);

  const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
  let needsVerification = false;
  if (requireVerification) {
    const userAuth = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerifiedAt: true },
    });
    needsVerification = !userAuth?.emailVerifiedAt;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-1 pb-20 sm:px-0">
      {/* Header mínimo */}
      <header className="mb-3 sm:mb-4 shrink-0">
        <h1 className="font-display text-section text-[var(--color-primary)]">
          {user.name ? `Hola, ${user.name}` : "Home"}
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm sm:text-base mt-0.5 truncate max-w-full">
          {user.name ? "Calendario y reservas" : "Calendario de clases"}
        </p>
      </header>

      {needsVerification && <EmailVerificationBanner />}

      {/* Planes activos / resumen: antes del calendario, con margen superior */}
      <section
        className="mt-[18px] mb-4 shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 shadow-[var(--shadow-sm)] sm:p-4"
        aria-labelledby="resumen-heading"
      >
        <h2 id="resumen-heading" className="sr-only">
          Tu resumen
        </h2>
        {hasActivePlan ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 text-[var(--color-text)]">
              <Sparkles className="h-4 w-4 text-[var(--color-secondary)] shrink-0" aria-hidden />
              <span className="font-medium text-[var(--color-primary)]">{planName}</span>
            </span>
            {todayReservations.length > 0 ? (
              <span className="text-[var(--color-text-muted)]">
                Hoy: {todayReservations.length} {todayReservations.length === 1 ? "reserva" : "reservas"}
              </span>
            ) : (
              <span className="text-[var(--color-text-muted)]">Hoy sin reservas</span>
            )}
            {showTrialCta && (
              <Link
                href="/panel/reservas"
                className="text-[var(--color-primary)] font-medium hover:underline cursor-pointer"
              >
                Clase de prueba gratis
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--color-text-muted)]">
              Sin plan activo
            </p>
            <Link
              href="/panel/tienda"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 cursor-pointer"
            >
              Ver planes
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}
      </section>

      {/* Calendario: protagonista */}
      <section
        className="min-h-0 flex-1 py-[18px] pb-4 sm:pb-6"
        aria-labelledby="calendario-heading"
      >
        <h2
          id="calendario-heading"
          className="sr-only sm:not-sr-only font-display text-lg font-semibold text-[var(--color-primary)] mb-3 sm:mb-4"
        >
          Calendario
        </h2>
        <PanelHomeCalendar
          centerId={centerId}
          weekStartDay={center?.calendarWeekStartDay ?? 1}
          role={user.role}
        />
      </section>

      {/* Accesos rápidos: fijos al fondo del viewport (siempre visibles al scroll) */}
      <section
        aria-labelledby="actions-heading"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 py-3 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-3xl px-2 sm:px-4">
          <h2 id="actions-heading" className="sr-only">
            Accesos rápidos
          </h2>
          <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          {getQuickAccessItems(
            user.role,
            center?.cancelBeforeMinutes ?? 720,
            center
              ? `Cancelación sin cargo si cancelás con al menos ${formatMinutesAsShortSpanish(center.cancelBeforeMinutes)} de anticipación`
              : undefined
          ).map((item) => {
            const baseClass =
              "flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-sm)] transition-[color,border-color,box-shadow,transform] duration-150 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2";
            if (item.type === "link") {
              const { href, label, Icon } = item;
              return (
                <li key={href}>
                  <Link href={href} className={baseClass}>
                    <Icon className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden />
                    <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
                  </Link>
                </li>
              );
            }
            if (item.type === "sheet-reservas") {
              return (
                <li key="sheet-reservas">
                  <PanelHomeMisReservasTrigger
                    cancelBeforeMinutes={item.cancelBeforeMinutes}
                    cancelPolicyCopy={item.cancelPolicyCopy}
                  />
                </li>
              );
            }
            if (item.type === "sheet-mis-clases") {
              return (
                <li key="sheet-mis-clases">
                  <PanelHomeMisClasesTrigger />
                </li>
              );
            }
            if (item.type === "disabled") {
              const { label, Icon } = item;
              return (
                <li key="disabled-mis-pagos">
                  <div
                    className={`${baseClass} cursor-not-allowed opacity-60`}
                    aria-disabled="true"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">{label}</span>
                  </div>
                </li>
              );
            }
            return null;
          })}
          </ul>
        </div>
      </section>
    </div>
  );
}
