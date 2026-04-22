import type { ICenterRepository, CenterPoliciesUpdate } from "@/lib/ports";
import type { Center } from "@/lib/domain";
import { prisma } from "./prisma";
function toDomainCenter(c: {
  id: string;
  name: string;
  slug: string;
  currency: string;
  cancelBeforeMinutes: number;
  maxNoShowsPerMonth: number;
  bookBeforeMinutes: number;
  notifyWhenSlotFreed: boolean;
  instructorCanReserveForStudent: boolean;
  allowTrialClassPerPerson: boolean;
  calendarStartHour: number;
  calendarEndHour: number;
  calendarWeekStartDay: number;
  defaultClassDurationMinutes: number;
  bankTransferEnabled: boolean;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankAccountRut: string | null;
  bankAccountEmail: string | null;
  welcomeEmailCustomBody: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Center {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    currency: c.currency ?? "CLP",
    cancelBeforeMinutes: c.cancelBeforeMinutes,
    maxNoShowsPerMonth: c.maxNoShowsPerMonth,
    bookBeforeMinutes: c.bookBeforeMinutes,
    notifyWhenSlotFreed: c.notifyWhenSlotFreed,
    instructorCanReserveForStudent: c.instructorCanReserveForStudent,
    allowTrialClassPerPerson: c.allowTrialClassPerPerson,
    calendarStartHour: c.calendarStartHour,
    calendarEndHour: c.calendarEndHour,
    calendarWeekStartDay: c.calendarWeekStartDay,
    defaultClassDurationMinutes: c.defaultClassDurationMinutes,
    bankTransferEnabled: c.bankTransferEnabled,
    bankName: c.bankName,
    bankAccountType: c.bankAccountType,
    bankAccountNumber: c.bankAccountNumber,
    bankAccountHolder: c.bankAccountHolder,
    bankAccountRut: c.bankAccountRut,
    bankAccountEmail: c.bankAccountEmail,
    welcomeEmailCustomBody: c.welcomeEmailCustomBody ?? "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export const centerRepository: ICenterRepository = {
  async findById(id: string) {
    const c = await prisma.center.findUnique({ where: { id } });
    return c ? toDomainCenter(c) : null;
  },

  async findBySlug(slug: string) {
    const c = await prisma.center.findUnique({ where: { slug } });
    return c ? toDomainCenter(c) : null;
  },

  async create(data: { name: string; slug: string }) {
    const c = await prisma.center.create({ data });
    return toDomainCenter(c);
  },

  async findAll() {
    const list = await prisma.center.findMany({ orderBy: { name: "asc" } });
    return list.map(toDomainCenter);
  },

  async updatePolicies(centerId: string, data: CenterPoliciesUpdate) {
    const payload: Record<string, unknown> = {};
    if (data.cancelBeforeMinutes !== undefined) payload.cancelBeforeMinutes = data.cancelBeforeMinutes;
    if (data.maxNoShowsPerMonth !== undefined) payload.maxNoShowsPerMonth = data.maxNoShowsPerMonth;
    if (data.bookBeforeMinutes !== undefined) payload.bookBeforeMinutes = data.bookBeforeMinutes;
    if (data.notifyWhenSlotFreed !== undefined) payload.notifyWhenSlotFreed = data.notifyWhenSlotFreed;
    if (data.instructorCanReserveForStudent !== undefined) payload.instructorCanReserveForStudent = data.instructorCanReserveForStudent;
    if (data.allowTrialClassPerPerson !== undefined) payload.allowTrialClassPerPerson = data.allowTrialClassPerPerson;
    if (data.calendarStartHour !== undefined) payload.calendarStartHour = data.calendarStartHour;
    if (data.calendarEndHour !== undefined) payload.calendarEndHour = data.calendarEndHour;
    if (data.calendarWeekStartDay !== undefined) payload.calendarWeekStartDay = data.calendarWeekStartDay;
    if (data.defaultClassDurationMinutes !== undefined) payload.defaultClassDurationMinutes = data.defaultClassDurationMinutes;
    if (data.welcomeEmailCustomBody !== undefined) payload.welcomeEmailCustomBody = data.welcomeEmailCustomBody;
    const c = await prisma.center.update({
      where: { id: centerId },
      data: payload as Parameters<typeof prisma.center.update>[0]["data"],
    });
    return toDomainCenter(c);
  },
};
