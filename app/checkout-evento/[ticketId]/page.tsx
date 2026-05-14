import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import {
  centerRepository,
  eventRepository,
  eventTicketRepository,
  mercadopagoConfigRepository,
} from "@/lib/adapters/db";
import { CheckoutEventClient } from "./CheckoutEventClient";
import { getCenterTimezone } from "@/lib/datetime/center-timezone";

interface Props {
  params: Promise<{ ticketId: string }>;
}

function buildDateFmt(tz: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

function eventMetaText(
  event: { startsAt: Date; location: string | null },
  tz: string,
): string {
  const parts: string[] = [buildDateFmt(tz).format(event.startsAt)];
  if (event.location) parts.push(event.location);
  return parts.join(" · ");
}

export default async function CheckoutEventPage({ params }: Props) {
  const { ticketId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/checkout-evento/${ticketId}`);
  }

  const ticket = await eventTicketRepository.findById(ticketId);
  if (!ticket) notFound();
  if (ticket.userId !== session.user.id) notFound();
  if (ticket.status !== "PENDING") {
    redirect(`/panel/mis-pagos?recien=ticket-${ticket.id}`);
  }

  const event = await eventRepository.findById(ticket.eventId);
  if (!event) notFound();

  const [center, mpConfig] = await Promise.all([
    centerRepository.findById(event.centerId),
    mercadopagoConfigRepository.findStatusByCenterId(event.centerId),
  ]);
  if (!center) notFound();

  const tz = await getCenterTimezone(event.centerId);

  // Si el ticket ya fue claimado por transferencia, redirigir a mis-pagos.
  // Para detectarlo necesitamos el campo en la BD; el ticket del repo aún
  // no lo expone, así que lo leemos directo con prisma.
  const { prisma } = await import("@/lib/adapters/db/prisma");
  const ticketRaw = await prisma.eventTicket.findUnique({
    where: { id: ticket.id },
    select: { transferClaimedAt: true },
  });
  if (ticketRaw?.transferClaimedAt) {
    redirect(`/panel/mis-pagos?recien=ticket-${ticket.id}`);
  }

  const transferAvailable =
    center.bankTransferEnabled &&
    center.bankTransferAcceptEvents &&
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
    <CheckoutEventClient
      ticketId={ticket.id}
      eventTitle={event.title}
      eventMeta={eventMetaText(event, tz)}
      amountCents={ticket.amountCents}
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
