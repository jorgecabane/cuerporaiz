import { prisma } from "./prisma";
import type {
  IInstructorBankAccountRepository,
  InstructorBankAccount,
} from "@/lib/ports/instructor-bank-account-repository";

function toDomain(row: {
  id: string;
  centerId: string;
  userId: string;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankAccountRut: string | null;
  bankAccountEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}): InstructorBankAccount {
  return {
    id: row.id,
    centerId: row.centerId,
    userId: row.userId,
    bankName: row.bankName,
    bankAccountType: row.bankAccountType,
    bankAccountNumber: row.bankAccountNumber,
    bankAccountHolder: row.bankAccountHolder,
    bankAccountRut: row.bankAccountRut,
    bankAccountEmail: row.bankAccountEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const instructorBankAccountRepository: IInstructorBankAccountRepository = {
  async findByCenterIdAndUserId(centerId, userId) {
    const row = await prisma.instructorBankAccount.findUnique({
      where: { centerId_userId: { centerId, userId } },
    });
    return row ? toDomain(row) : null;
  },

  async upsert(input) {
    const row = await prisma.instructorBankAccount.upsert({
      where: { centerId_userId: { centerId: input.centerId, userId: input.userId } },
      create: {
        centerId: input.centerId,
        userId: input.userId,
        bankName: input.bankName ?? null,
        bankAccountType: input.bankAccountType ?? null,
        bankAccountNumber: input.bankAccountNumber ?? null,
        bankAccountHolder: input.bankAccountHolder ?? null,
        bankAccountRut: input.bankAccountRut ?? null,
        bankAccountEmail: input.bankAccountEmail ?? null,
      },
      update: {
        bankName: input.bankName ?? null,
        bankAccountType: input.bankAccountType ?? null,
        bankAccountNumber: input.bankAccountNumber ?? null,
        bankAccountHolder: input.bankAccountHolder ?? null,
        bankAccountRut: input.bankAccountRut ?? null,
        bankAccountEmail: input.bankAccountEmail ?? null,
      },
    });
    return toDomain(row);
  },
};

