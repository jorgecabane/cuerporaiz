import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import {
  userRepository,
  orderRepository,
  planRepository,
  userPlanRepository,
  reservationRepository,
  liveClassRepository,
} from "@/lib/adapters/db";
import { isAdminRole } from "@/lib/domain";
import {
  USER_PLAN_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  classesRemaining,
} from "@/lib/domain/user-plan";
import { prisma } from "@/lib/adapters/db/prisma";
import { Button } from "@/components/ui/Button";
import { AssignPlanForm } from "./AssignPlanForm";
import { EditClientForm } from "./EditClientForm";
import { PlanActions } from "./PlanActions";
import { RegisterManualPayment } from "./RegisterManualPayment";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

const SEX_LABELS: Record<string, string> = { F: "Femenino", M: "Masculino", X: "Otro" };

function formatPrice(cents: number, currency: string): string {
  if (currency === "CLP") return `$${cents.toLocaleString("es-CL")}`;
  return `${cents / 100} ${currency}`;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/panel/clientes");
  if (!isAdminRole(session.user.role)) redirect("/panel");
  const centerId = session.user.centerId as string;
  const { id: userId } = await params;

  const clients = await userRepository.findManyByCenterId(centerId);
  const client = clients.find((u) => u.id === userId);
  if (!client) notFound();

  const [userPlans, orders, plans, reservations, manualPayments] = await Promise.all([
    userPlanRepository.findByUserAndCenter(userId, centerId),
    orderRepository.findManyByUserIdAndCenterId(userId, centerId),
    planRepository.findManyByCenterId(centerId),
    reservationRepository.findByUserId(userId),
    prisma.manualPayment.findMany({
      where: { centerId, userId },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

  const classReservations = [];
  for (const r of reservations) {
    const lc = await liveClassRepository.findById(r.liveClassId);
    if (!lc || lc.centerId !== centerId) continue;
    classReservations.push({ ...r, liveClass: lc });
  }
  classReservations.sort(
    (a, b) => b.liveClass.startsAt.getTime() - a.liveClass.startsAt.getTime()
  );

  const now = new Date();
  const pastClasses = classReservations.filter((r) => r.liveClass.startsAt < now);
  const futureClasses = classReservations.filter((r) => r.liveClass.startsAt >= now);

  const birthdayStr = client.birthday
    ? client.birthday.toISOString().split("T")[0]
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      {/* Info del cliente */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-section text-[var(--color-primary)]">
            Ficha de alumna
          </h1>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Nombre</dt>
              <dd className="font-medium mt-0.5">{client.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Apellido</dt>
              <dd className="font-medium mt-0.5">{client.lastName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Email</dt>
              <dd className="font-medium mt-0.5">{client.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Teléfono</dt>
              <dd className="font-medium mt-0.5">{client.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">RUT</dt>
              <dd className="font-medium mt-0.5">{client.rut || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Sexo</dt>
              <dd className="font-medium mt-0.5">{client.sex ? SEX_LABELS[client.sex] ?? client.sex : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Cumpleaños</dt>
              <dd className="font-medium mt-0.5">
                {client.birthday ? client.birthday.toLocaleDateString("es-CL") : "—"}
              </dd>
            </div>
            {client.notes && (
              <div className="col-span-2">
                <dt className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Observaciones</dt>
                <dd className="mt-0.5 text-sm">{client.notes}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4">
            <EditClientForm
              userId={userId}
              currentName={client.name ?? null}
              currentLastName={client.lastName ?? null}
              currentEmail={client.email}
              currentPhone={client.phone ?? null}
              currentRut={client.rut ?? null}
              currentBirthday={birthdayStr}
              currentSex={client.sex ?? null}
              currentNotes={client.notes ?? null}
            />
          </div>
        </div>
      </section>

      {/* Planes */}
      <section>
        <h2 className="font-semibold text-[var(--color-text)] mb-3">
          Planes ({userPlans.length})
        </h2>
        {userPlans.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Sin planes asignados.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {userPlans.map((up) => {
              const plan = planMap[up.planId];
              const remaining = classesRemaining(up);
              const isLive = plan?.type === "LIVE";
              return (
                <li
                  key={up.id}
                  className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{plan?.name ?? "Plan eliminado"}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          up.status === "ACTIVE"
                            ? "bg-[var(--color-success-bg,#dcfce7)] text-[var(--color-success,#16a34a)]"
                            : up.status === "FROZEN"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-[var(--color-surface-alt,#f3f4f6)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {USER_PLAN_STATUS_LABELS[up.status]}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          up.paymentStatus === "PAID"
                            ? "bg-[var(--color-success-bg,#dcfce7)] text-[var(--color-success,#16a34a)]"
                            : up.paymentStatus === "PARTIAL"
                              ? "bg-[var(--color-warning-bg,#fefce8)] text-[var(--color-warning,#ca8a04)]"
                              : "bg-[var(--color-error-bg,#fef2f2)] text-[var(--color-error,#dc2626)]"
                        }`}
                      >
                        {PAYMENT_STATUS_LABELS[up.paymentStatus]}
                      </span>
                    </div>
                    {remaining !== null && (
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {remaining}/{up.classesTotal} clases
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-[var(--color-text-muted)] flex-wrap">
                    <span>Desde: {up.validFrom.toLocaleDateString("es-CL")}</span>
                    {up.validUntil && (
                      <span>Hasta: {up.validUntil.toLocaleDateString("es-CL")}</span>
                    )}
                    {up.status === "FROZEN" && up.freezeReason && (
                      <span>Motivo: {up.freezeReason}</span>
                    )}
                    {up.status === "FROZEN" && up.frozenUntil && (
                      <span>Descongelar: {up.frozenUntil.toLocaleDateString("es-CL")}</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <PlanActions
                      userPlanId={up.id}
                      status={up.status}
                      paymentStatus={up.paymentStatus}
                      isLive={isLive}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3">
          <AssignPlanForm userId={userId} centerId={centerId} plans={plans} />
        </div>
      </section>

      {/* Pagos manuales + ordenes */}
      <section>
        <h2 className="font-semibold text-[var(--color-text)] mb-3">
          Pagos ({orders.length + manualPayments.length})
        </h2>

        {manualPayments.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Pagos manuales</h3>
            <ul className="space-y-2">
              {manualPayments.map((mp) => {
                const linkedPlan = mp.userPlanId
                  ? userPlans.find((up) => up.id === mp.userPlanId)
                  : null;
                const linkedPlanName = linkedPlan
                  ? planMap[linkedPlan.planId]?.name ?? "Plan"
                  : null;
                return (
                  <li
                    key={mp.id}
                    className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-sm flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">
                        {formatPrice(mp.amountCents, mp.currency)}
                      </span>
                      {linkedPlanName && (
                        <span className="text-[var(--color-text-muted)]"> · {linkedPlanName}</span>
                      )}
                      {mp.note && (
                        <span className="text-[var(--color-text-muted)]"> — {mp.note}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <span className="capitalize">{mp.method}</span>
                      <span>{mp.paidAt.toLocaleDateString("es-CL")}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {orders.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Ordenes (MercadoPago)</h3>
            <ul className="space-y-2">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-sm flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">
                      {planMap[order.planId]?.name ?? order.planId}
                    </span>
                    {" · "}
                    {formatPrice(order.amountCents, order.currency)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.status === "APPROVED"
                          ? "bg-[var(--color-success-bg,#dcfce7)] text-[var(--color-success,#16a34a)]"
                          : order.status === "PENDING"
                            ? "bg-[var(--color-warning-bg,#fefce8)] text-[var(--color-warning,#ca8a04)]"
                            : "bg-[var(--color-surface-alt,#f3f4f6)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {order.createdAt.toLocaleDateString("es-CL")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {orders.length === 0 && manualPayments.length === 0 && (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 mb-3">
            <p className="text-sm text-[var(--color-text-muted)]">Sin pagos registrados.</p>
          </div>
        )}

        <RegisterManualPayment
          userId={userId}
          userPlans={userPlans.map((up) => ({
            id: up.id,
            planName: planMap[up.planId]?.name ?? "Plan",
          }))}
        />
      </section>

      {/* Clases futuras */}
      <section>
        <h2 className="font-semibold text-[var(--color-text)] mb-3">
          Clases agendadas ({futureClasses.length})
        </h2>
        {futureClasses.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Sin clases futuras.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {futureClasses.map((r) => (
              <li key={r.id} className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-sm flex items-center justify-between">
                <div>
                  <span className="font-medium">{r.liveClass.title}</span>
                  <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                    {r.liveClass.startsAt.toLocaleDateString("es-CL")}{" "}
                    {r.liveClass.startsAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === "CONFIRMED"
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "bg-[var(--color-surface-alt,#f3f4f6)] text-[var(--color-text-muted)]"
                }`}>
                  {r.status === "CONFIRMED" ? "Confirmada" : r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historial */}
      <section>
        <h2 className="font-semibold text-[var(--color-text)] mb-3">
          Historial ({pastClasses.length})
        </h2>
        {pastClasses.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">Sin historial de clases.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {pastClasses.slice(0, 20).map((r) => (
              <li key={r.id} className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-sm flex items-center justify-between">
                <div>
                  <span className="font-medium">{r.liveClass.title}</span>
                  <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                    {r.liveClass.startsAt.toLocaleDateString("es-CL")}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === "ATTENDED"
                    ? "bg-[var(--color-success-bg,#dcfce7)] text-[var(--color-success,#16a34a)]"
                    : r.status === "NO_SHOW"
                      ? "bg-[var(--color-error-bg,#fef2f2)] text-[var(--color-error,#dc2626)]"
                      : r.status === "CANCELLED"
                        ? "bg-[var(--color-surface-alt,#f3f4f6)] text-[var(--color-text-muted)]"
                        : "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                }`}>
                  {r.status === "ATTENDED" ? "Asistió" : r.status === "NO_SHOW" ? "No-show" : r.status === "CANCELLED" ? "Cancelada" : r.status}
                </span>
              </li>
            ))}
            {pastClasses.length > 20 && (
              <li className="text-center text-xs text-[var(--color-text-muted)] py-2">
                Mostrando las últimas 20 de {pastClasses.length}
              </li>
            )}
          </ul>
        )}
      </section>

      <div className="pt-4">
        <Button href="/panel/clientes" variant="secondary">
          Volver a alumnas
        </Button>
      </div>
    </div>
  );
}
