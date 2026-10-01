"use server";

import { redirect } from "next/navigation";
import { centerRepository } from "@/lib/adapters/db";
import { subscribeToNewsletter, unsubscribeFromNewsletter } from "@/lib/application/newsletter";
import { verifyNewsletterToken } from "@/lib/application/newsletter-token";

async function verifiedCenterId(email: string, token: string): Promise<string | null> {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
  const center = slug ? await centerRepository.findBySlug(slug) : null;
  if (!center || !email || !token) return null;
  return verifyNewsletterToken(center.id, email, token) ? center.id : null;
}

function backTo(email: string, token: string, state: string): never {
  const params = new URLSearchParams({ e: email, t: token, estado: state });
  redirect(`/newsletter/baja?${params.toString()}`);
}

export async function confirmUnsubscribe(formData: FormData): Promise<void> {
  const email = String(formData.get("e") ?? "");
  const token = String(formData.get("t") ?? "");
  const centerId = await verifiedCenterId(email, token);
  if (!centerId) backTo(email, token, "invalido");
  await unsubscribeFromNewsletter(centerId, email);
  backTo(email, token, "baja");
}

export async function resubscribe(formData: FormData): Promise<void> {
  const email = String(formData.get("e") ?? "");
  const token = String(formData.get("t") ?? "");
  const centerId = await verifiedCenterId(email, token);
  if (!centerId) backTo(email, token, "invalido");
  await subscribeToNewsletter(centerId, email);
  backTo(email, token, "suscrito");
}
