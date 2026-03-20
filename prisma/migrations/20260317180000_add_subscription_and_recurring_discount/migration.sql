-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'PAYMENT_FAILED');

-- AlterTable Plan: add recurringDiscountPercent
ALTER TABLE "Plan" ADD COLUMN "recurringDiscountPercent" INTEGER DEFAULT 0;

-- CreateTable Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "mpSubscriptionId" TEXT NOT NULL,
    "mpPayerId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_mpSubscriptionId_key" ON "Subscription"("mpSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_centerId_idx" ON "Subscription"("centerId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_mpSubscriptionId_idx" ON "Subscription"("mpSubscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable UserPlan: add subscriptionId
ALTER TABLE "UserPlan" ADD COLUMN "subscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "UserPlan_subscriptionId_idx" ON "UserPlan"("subscriptionId");

-- AddForeignKey
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Order: add subscriptionId
ALTER TABLE "Order" ADD COLUMN "subscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "Order_subscriptionId_idx" ON "Order"("subscriptionId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
