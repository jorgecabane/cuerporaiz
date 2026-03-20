-- AlterTable
ALTER TABLE "Center" ADD COLUMN     "bookBeforeHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "notifyWhenSlotFreed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "instructorCanReserveForStudent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowTrialClassPerPerson" BOOLEAN NOT NULL DEFAULT true;
