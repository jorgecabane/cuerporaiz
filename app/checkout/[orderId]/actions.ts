"use server";

import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createMpPreferenceForOrder } from "@/lib/application/checkout";
import { claimTransferForOrder } from "@/lib/application/claim-transfer";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim();
  return `${proto}://${host}`;
}

export async function continueWithMercadoPago(orderId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/checkout/${orderId}`);
  }
  const baseUrl = await getBaseUrl();
  const nameParts = (session.user.name ?? "").trim().split(/\s+/);
  const result = await createMpPreferenceForOrder({
    orderId,
    baseUrl,
    payerEmail: session.user.email ?? undefined,
    payerFirstName: nameParts[0] || undefined,
    payerLastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
  });
  if (!result.success || !result.checkoutUrl) {
    return { error: result.error ?? "No se pudo iniciar el pago con MercadoPago" };
  }
  redirect(result.checkoutUrl);
}

export async function submitTransferClaim(formData: FormData): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  const orderId = formData.get("orderId");
  const receiptDocId = formData.get("receiptDocId");
  if (typeof orderId !== "string" || !orderId.trim()) {
    return { error: "Falta orderId" };
  }
  const result = await claimTransferForOrder({
    orderId: orderId.trim(),
    userId: session.user.id,
    receiptDocId: typeof receiptDocId === "string" && receiptDocId.trim() ? receiptDocId.trim() : null,
  });
  if (!result.success) {
    return { error: result.message };
  }
  redirect(result.redirectTo);
}
