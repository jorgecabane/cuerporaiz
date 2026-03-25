import { prisma } from "./prisma";
import type { IEmailPreferenceRepository, UpsertEmailPreferenceInput } from "@/lib/ports/email-preference-repository";
import type { EmailPreference, EmailPreferenceType } from "@/lib/domain/email-preference";

export const emailPreferenceRepository: IEmailPreferenceRepository = {
  async findByUserAndCenter(userId: string, centerId: string): Promise<EmailPreference | null> {
    return prisma.emailPreference.findUnique({
      where: { userId_centerId: { userId, centerId } },
    });
  },

  async upsert(input: UpsertEmailPreferenceInput): Promise<EmailPreference> {
    const { userId, centerId, ...prefs } = input;
    return prisma.emailPreference.upsert({
      where: { userId_centerId: { userId, centerId } },
      create: { userId, centerId, ...prefs },
      update: prefs,
    });
  },

  async isEnabled(userId: string, centerId: string, type: EmailPreferenceType): Promise<boolean> {
    const pref = await prisma.emailPreference.findUnique({
      where: { userId_centerId: { userId, centerId } },
      select: { [type]: true },
    });
    if (!pref) return true; // Default: all ON
    return pref[type] as boolean;
  },
};
