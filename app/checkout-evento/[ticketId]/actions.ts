"use server";

import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createMpPreferenceForTicket } from "@/lib/application/event-checkout";
import { claimTransferForEventTicket } from "@/lib/application/claim-transfer";
import { requestBaseUrl } from "@/lib/utils/request-base-url";

export async function continueWithMercadoPagoEvent(ticketId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/checkout-evento/${ticketId}`);
  }
  const baseUrl = requestBaseUrl(await headers());
  const nameParts = (session.user.name ?? "").trim().split(/\s+/);
  const result = await createMpPreferenceForTicket({
    ticketId,
    userId: session.user.id,
    baseUrl,
    payerEmail: session.user.email ?? undefined,
    payerFirstName: nameParts[0] || undefined,
    payerLastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
  });
  if (!result.success) {
    return { error: result.message };
  }
  redirect(result.checkoutUrl);
}

export async function submitTransferClaimForEvent(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  const ticketId = formData.get("ticketId");
  const receiptDocId = formData.get("receiptDocId");
  if (typeof ticketId !== "string" || !ticketId.trim()) {
    return { error: "Falta ticketId" };
  }
  const result = await claimTransferForEventTicket({
    ticketId: ticketId.trim(),
    userId: session.user.id,
    receiptDocId: typeof receiptDocId === "string" && receiptDocId.trim() ? receiptDocId.trim() : null,
  });
  if (!result.success) {
    return { error: result.message };
  }
  redirect(result.redirectTo);
}
