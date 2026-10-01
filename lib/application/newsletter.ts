import {
  newsletterSubscriberRepository,
  emailPreferenceRepository,
  userRepository,
} from "@/lib/adapters/db";
import { normalizeEmail } from "@/lib/domain/newsletter";

/**
 * Suscribe (o reactiva) un email al newsletter del blog. Si el email ya es
 * alumno del centro, también prende su switch "Nuevos artículos del blog".
 */
export async function subscribeToNewsletter(centerId: string, rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  await newsletterSubscriberRepository.subscribe(centerId, email);
  await setStudentBlogPreference(centerId, email, true);
}

/** Da de baja un email: suscriptor y, si es alumno, su switch del blog. */
export async function unsubscribeFromNewsletter(centerId: string, rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  await newsletterSubscriberRepository.unsubscribe(centerId, email);
  await setStudentBlogPreference(centerId, email, false);
}

async function setStudentBlogPreference(centerId: string, email: string, enabled: boolean) {
  const user = await userRepository.findByEmail(email);
  if (!user) return;
  const membership = await userRepository.findMembership(user.id, centerId);
  if (!membership) return;
  await emailPreferenceRepository.upsert({ userId: user.id, centerId, blogPublished: enabled });
}
