-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';

-- AlterTable: change default
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'PENDING';
