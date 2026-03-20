-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('PACK', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CenterMercadoPagoConfig" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterMercadoPagoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "type" "PlanType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "externalReference" TEXT NOT NULL,
    "mpPreferenceId" TEXT,
    "mpPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MercadoPagoWebhookEvent" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MercadoPagoWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CenterMercadoPagoConfig_centerId_key" ON "CenterMercadoPagoConfig"("centerId");

-- CreateIndex
CREATE INDEX "Plan_centerId_idx" ON "Plan"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_centerId_slug_key" ON "Plan"("centerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Order_externalReference_key" ON "Order"("externalReference");

-- CreateIndex
CREATE INDEX "Order_centerId_idx" ON "Order"("centerId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_externalReference_idx" ON "Order"("externalReference");

-- CreateIndex
CREATE INDEX "Order_mpPaymentId_idx" ON "Order"("mpPaymentId");

-- CreateIndex
CREATE INDEX "MercadoPagoWebhookEvent_centerId_idx" ON "MercadoPagoWebhookEvent"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "MercadoPagoWebhookEvent_centerId_requestId_key" ON "MercadoPagoWebhookEvent"("centerId", "requestId");

-- AddForeignKey
ALTER TABLE "CenterMercadoPagoConfig" ADD CONSTRAINT "CenterMercadoPagoConfig_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MercadoPagoWebhookEvent" ADD CONSTRAINT "MercadoPagoWebhookEvent_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
