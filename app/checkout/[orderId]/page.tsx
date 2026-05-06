import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { centerRepository, orderRepository, planRepository, mercadopagoConfigRepository } from "@/lib/adapters/db";
import { CheckoutOrderClient } from "./CheckoutOrderClient";

interface Props {
  params: Promise<{ orderId: string }>;
}

function planMetaText(plan: { validityDays: number | null; validityPeriod: string | null; maxReservations: number | null }): string {
  const parts: string[] = [];
  if (plan.validityDays != null) parts.push(`vigencia ${plan.validityDays} días`);
  else if (plan.validityPeriod) parts.push(`vigencia ${plan.validityPeriod.toLowerCase()}`);
  if (plan.maxReservations != null) parts.push(`${plan.maxReservations} clases`);
  return parts.join(" · ");
}

export default async function CheckoutOrderPage({ params }: Props) {
  const { orderId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/checkout/${orderId}`);
  }

  const order = await orderRepository.findById(orderId);
  if (!order) notFound();
  if (order.userId !== session.user.id) notFound();

  // Si la orden ya no está en PENDING o ya fue claimada por transferencia,
  // mandamos al historial de pagos en vez de re-mostrar el checkout.
  if (order.status !== "PENDING") {
    redirect(`/panel/mis-pagos?recien=${order.id}`);
  }
  if (order.transferClaimedAt) {
    redirect(`/panel/mis-pagos?recien=${order.id}`);
  }

  const [plan, center, mpConfig] = await Promise.all([
    planRepository.findById(order.planId),
    centerRepository.findById(order.centerId),
    mercadopagoConfigRepository.findStatusByCenterId(order.centerId),
  ]);
  if (!plan || !center) notFound();

  const transferAvailable =
    center.bankTransferEnabled &&
    center.bankTransferAcceptPlans &&
    Boolean(
      center.bankName &&
        center.bankAccountType &&
        center.bankAccountNumber &&
        center.bankAccountHolder &&
        center.bankAccountRut &&
        center.bankAccountEmail,
    );
  const mpEnabled = Boolean(mpConfig?.enabled && mpConfig?.hasCredentials);

  return (
    <CheckoutOrderClient
      orderId={order.id}
      planName={plan.name}
      planMeta={planMetaText(plan)}
      amountCents={order.amountCents}
      centerName={center.name}
      bank={{
        bankName: center.bankName,
        bankAccountType: center.bankAccountType,
        bankAccountNumber: center.bankAccountNumber,
        bankAccountHolder: center.bankAccountHolder,
        bankAccountRut: center.bankAccountRut,
        bankAccountEmail: center.bankAccountEmail,
      }}
      transferAvailable={transferAvailable}
      receiptRequired={center.bankTransferRequireReceipt}
      mpEnabled={mpEnabled}
    />
  );
}
