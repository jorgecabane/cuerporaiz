export interface BankAccountValues {
  bankName?: string | null;
  bankAccountType?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  bankAccountRut?: string | null;
  bankAccountEmail?: string | null;
}

export interface InstructorBankAccount {
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
}

export interface SaveInstructorBankAccountInput extends BankAccountValues {
  centerId: string;
  userId: string;
}

export interface IInstructorBankAccountRepository {
  findByCenterIdAndUserId(centerId: string, userId: string): Promise<InstructorBankAccount | null>;
  upsert(input: SaveInstructorBankAccountInput): Promise<InstructorBankAccount>;
}

