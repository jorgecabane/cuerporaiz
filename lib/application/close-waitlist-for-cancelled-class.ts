/**
 * Caso de uso: cuando admin cancela una clase entera, se cierra su waitlist
 * y se notifica a cada estudiante en cola que la clase fue cancelada.
 *
 * Llamado fire-and-forget desde batchCancelLiveClasses (app/panel/horarios/actions.ts).
 */
import {
  liveClassRepository,
  userRepository,
  waitlistRepository,
} from "@/lib/adapters/db";
import { sendEmailSafe } from "@/lib/application/send-email";
import { buildWaitlistClassCancelledEmail } from "@/lib/email/waitlist";
import { getEmailBranding } from "@/lib/email/branding";

export async function closeWaitlistForCancelledClassUseCase(
  liveClassId: string
): Promise<void> {
  const liveClass = await liveClassRepository.findById(liveClassId);
  if (liveClass === null) return;

  const cancelledEntries = await waitlistRepository.cancelActiveByLiveClassId(liveClassId);
  if (cancelledEntries.length === 0) return;

  const branding = await getEmailBranding(liveClass.centerId);
  const location = liveClass.isOnline
    ? (liveClass.meetingUrl ?? "Online")
    : (branding.contactAddress ?? "Presencial");

  for (const entry of cancelledEntries) {
    const user = await userRepository.findById(entry.userId);
    if (user === null) continue;
    sendEmailSafe(
      buildWaitlistClassCancelledEmail({
        toEmail: user.email,
        userName: user.name ?? undefined,
        className: liveClass.title,
        startAt: liveClass.startsAt.toISOString(),
        location,
        branding,
      })
    );
  }
}
