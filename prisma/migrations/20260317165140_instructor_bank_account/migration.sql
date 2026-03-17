-- CreateTable
CREATE TABLE "InstructorBankAccount" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAccountType" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountHolder" TEXT,
    "bankAccountRut" TEXT,
    "bankAccountEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstructorBankAccount_centerId_idx" ON "InstructorBankAccount"("centerId");

-- CreateIndex
CREATE INDEX "InstructorBankAccount_userId_idx" ON "InstructorBankAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorBankAccount_centerId_userId_key" ON "InstructorBankAccount"("centerId", "userId");

-- AddForeignKey
ALTER TABLE "InstructorBankAccount" ADD CONSTRAINT "InstructorBankAccount_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorBankAccount" ADD CONSTRAINT "InstructorBankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
