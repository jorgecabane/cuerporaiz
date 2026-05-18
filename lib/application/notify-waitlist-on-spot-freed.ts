/**
 * Función central del flujo waitlist: cuando se libera un cupo en una clase
 * o evento, notifica a TODOS los de la waitlist activa (broadcast).
 *
 * Diseño:
 * - Event-driven: se llama desde los puntos de cancelación (no es un cron).
 * - Async fire-and-forget desde el caller (los emails no bloquean al usuario).
 * - Lazy expiration de holds en eventos (reemplaza al cron).
 * - Throttle por entry (10 min mínimo entre correos).
 * - Si el centro tiene notifyWhenSlotFreed=false, no envía pero sí permite que
 *   el flag actúe como interruptor (sin entries muertas).
 */
import {
  centerRepository,
  liveClassRepository,
  eventRepository,
  eventTicketRepository,
  userRepository,
  waitlistRepository,
} from "@/lib/adapters/db";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildSpotFreedEmail } from "@/lib/email/waitlist";
import { getEmailBranding } from "@/lib/email/branding";
import { getBaseUrl } from "@/lib/utils/base-url";
import { shouldThrottleNotification } from "@/lib/domain/waitlist";
import { releaseExpiredEventHolds } from "./release-expired-event-holds";

export type SpotFreedKind = "class" | "event";

export async function notifyWaitlistOnSpotFreed(
  kind: SpotFreedKind,
  itemId: string
): Promise<void> {
  if (kind === "class") {
    await notifyClass(itemId);
  } else {
    await notifyEvent(itemId);
  }
}

async function notifyClass(liveClassId: string): Promise<void> {
  const liveClass = await liveClassRepository.findById(liveClassId);
  if (liveClass === null) return;

  const center = await centerRepository.findById(liveClass.centerId);
  if (center === null) return;

  // Ventana de reserva: si la clase ya cerró reservas, no notificar
  const minutesUntilClass =
    (liveClass.startsAt.getTime() - Date.now()) / (1000 * 60);
  if (minutesUntilClass < center.bookBeforeMinutes) return;

  // Capacidad real: alguien pudo haber llenado el cupo entre el trigger y aquí
  const confirmed = await liveClassRepository.countConfirmedReservations(liveClassId);
  if (confirmed >= liveClass.maxCapacity) return;

  if (!center.notifyWhenSlotFreed) return;

  const entries = await waitlistRepository.findActiveByItem("class", liveClassId);
  if (entries.length === 0) return;

  const baseUrl = getBaseUrl();
  const branding = await getEmailBranding(liveClass.centerId);
  const location = liveClass.isOnline
    ? (liveClass.meetingUrl ?? "Por confirmar")
    : (branding.contactAddress ?? "Presencial");
  const endAt = new Date(
    liveClass.startsAt.getTime() + liveClass.durationMinutes * 60_000
  );

  const now = new Date();
  for (const entry of entries) {
    if (shouldThrottleNotification(entry.notifiedAt, now)) continue;
    const user = await userRepository.findById(entry.userId);
    if (user === null) continue;
    // Marcar notificado ANTES de despachar el correo: si el envío falla, se pierde
    // un email pero el próximo trigger respeta el throttle. Es preferible perder
    // un aviso a inundar al usuario con duplicados si la lambda muere mid-batch.
    await waitlistRepository.markNotified(entry.id, now);
    sendEmailSafe(
      buildSpotFreedEmail({
        toEmail: user.email,
        userName: user.name ?? undefined,
        itemKind: "class",
        itemName: liveClass.title,
        startAt: liveClass.startsAt.toISOString(),
        endAt: endAt.toISOString(),
        location,
        bookUrl: `${baseUrl}/panel?openClass=${liveClass.id}&fromWaitlist=1`,
        ctaLabel: "Reservar ahora",
        branding,
      })
    );
  }
}

async function notifyEvent(eventId: string): Promise<void> {
  // Lazy: liberar holds expirados antes de evaluar capacidad
  const now = new Date();
  await waitlistRepository.expireEventHolds(eventId, now);
  // releaseExpiredEventHolds está re-exportado y normalmente se usa desde otros
  // call sites; aquí llamamos directo al repo para evitar dependencia circular.
  // (releaseExpiredEventHolds es la API pública para callers externos.)
  void releaseExpiredEventHolds; // mantener import (dead-code stripper)

  const event = await eventRepository.findById(eventId);
  if (event === null) return;

  const center = await centerRepository.findById(event.centerId);
  if (center === null) return;
  if (!center.notifyWhenSlotFreed) return;
  if (event.maxCapacity === null) return;

  // Capacidad: PAID + HELD activos
  const paid = await eventTicketRepository.countPaidByEventId(eventId);
  const heldNow = new Date();
  const held = await waitlistRepository.countActiveHoldsByEventId(eventId, heldNow);
  if (paid + held >= event.maxCapacity) return;

  const entries = await waitlistRepository.findActiveByItem("event", eventId);
  if (entries.length === 0) return;

  const baseUrl = getBaseUrl();
  const branding = await getEmailBranding(event.centerId);
  const location = event.location ?? "Centro";

  const nowIter = new Date();
  for (const entry of entries) {
    if (shouldThrottleNotification(entry.notifiedAt, nowIter)) continue;
    const user = await userRepository.findById(entry.userId);
    if (user === null) continue;
    // Marcar notificado ANTES de despachar el correo (ver nota en notifyClass).
    await waitlistRepository.markNotified(entry.id, nowIter);
    sendEmailSafe(
      buildSpotFreedEmail({
        toEmail: user.email,
        userName: user.name ?? undefined,
        itemKind: "event",
        itemName: event.title,
        startAt: event.startsAt.toISOString(),
        endAt: event.endsAt.toISOString(),
        location,
        bookUrl: `${baseUrl}/panel/eventos/${event.id}?fromWaitlist=1`,
        ctaLabel: "Ir al pago",
        branding,
      })
    );
  }
}
