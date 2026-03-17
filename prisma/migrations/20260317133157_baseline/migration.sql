-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RepeatFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "UserPlanStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlanPaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRATOR', 'INSTRUCTOR', 'STUDENT');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('PACK', 'MEMBERSHIP', 'LIVE', 'ON_DEMAND', 'MEMBERSHIP_ON_DEMAND');

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('ONE_TIME', 'RECURRING', 'BOTH');

-- CreateEnum
CREATE TYPE "ValidityPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'QUADRIMESTRAL', 'SEMESTER', 'ANNUAL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Center" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "cancelBeforeHours" INTEGER NOT NULL DEFAULT 12,
    "maxNoShowsPerMonth" INTEGER NOT NULL DEFAULT 2,
    "bookBeforeHours" INTEGER NOT NULL DEFAULT 24,
    "notifyWhenSlotFreed" BOOLEAN NOT NULL DEFAULT true,
    "instructorCanReserveForStudent" BOOLEAN NOT NULL DEFAULT true,
    "allowTrialClassPerPerson" BOOLEAN NOT NULL DEFAULT true,
    "calendarStartHour" INTEGER NOT NULL DEFAULT 7,
    "calendarEndHour" INTEGER NOT NULL DEFAULT 22,
    "calendarWeekStartDay" INTEGER NOT NULL DEFAULT 1,
    "defaultClassDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "bankTransferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT,
    "bankAccountType" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountHolder" TEXT,
    "bankAccountRut" TEXT,
    "bankAccountEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Center_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "phone" TEXT,
    "rut" TEXT,
    "birthday" TIMESTAMP(3),
    "sex" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveClassSeries" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "disciplineId" TEXT,
    "instructorId" TEXT,
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "meetingUrl" TEXT,
    "isTrialClass" BOOLEAN NOT NULL DEFAULT false,
    "trialCapacity" INTEGER,
    "color" TEXT,
    "classPassEnabled" BOOLEAN NOT NULL DEFAULT false,
    "classPassCapacity" INTEGER,
    "repeatFrequency" "RepeatFrequency" NOT NULL DEFAULT 'WEEKLY',
    "repeatOnDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "repeatEveryN" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "repeatCount" INTEGER,
    "monthlyMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveClassSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveClass" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "disciplineId" TEXT,
    "instructorId" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "meetingUrl" TEXT,
    "isTrialClass" BOOLEAN NOT NULL DEFAULT false,
    "trialCapacity" INTEGER,
    "color" TEXT,
    "classPassEnabled" BOOLEAN NOT NULL DEFAULT false,
    "classPassCapacity" INTEGER,
    "seriesId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterHoliday" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CenterHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "UserPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "paymentStatus" "PlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "classesTotal" INTEGER,
    "classesUsed" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "frozenAt" TIMESTAMP(3),
    "frozenUntil" TIMESTAMP(3),
    "freezeReason" TEXT,
    "unfrozenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualPayment" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userPlanId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "method" TEXT NOT NULL DEFAULT 'transfer',
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "userPlanId" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCenterRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCenterRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterMercadoPagoConfig" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "mpUserId" TEXT,
    "publicKey" TEXT,
    "webhookSecret" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterMercadoPagoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterZoomConfig" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterZoomConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterGoogleMeetConfig" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterGoogleMeetConfig_pkey" PRIMARY KEY ("id")
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
    "validityDays" INTEGER,
    "validityPeriod" "ValidityPeriod",
    "billingMode" "BillingMode",
    "maxReservations" INTEGER,
    "maxReservationsPerDay" INTEGER,
    "maxReservationsPerWeek" INTEGER,
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
CREATE UNIQUE INDEX "Center_slug_key" ON "Center"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Discipline_centerId_idx" ON "Discipline"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "Discipline_centerId_name_key" ON "Discipline"("centerId", "name");

-- CreateIndex
CREATE INDEX "LiveClassSeries_centerId_idx" ON "LiveClassSeries"("centerId");

-- CreateIndex
CREATE INDEX "LiveClass_centerId_idx" ON "LiveClass"("centerId");

-- CreateIndex
CREATE INDEX "LiveClass_centerId_startsAt_idx" ON "LiveClass"("centerId", "startsAt");

-- CreateIndex
CREATE INDEX "LiveClass_startsAt_idx" ON "LiveClass"("startsAt");

-- CreateIndex
CREATE INDEX "LiveClass_disciplineId_idx" ON "LiveClass"("disciplineId");

-- CreateIndex
CREATE INDEX "LiveClass_seriesId_idx" ON "LiveClass"("seriesId");

-- CreateIndex
CREATE INDEX "CenterHoliday_centerId_idx" ON "CenterHoliday"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "CenterHoliday_centerId_date_key" ON "CenterHoliday"("centerId", "date");

-- CreateIndex
CREATE INDEX "UserPlan_userId_centerId_idx" ON "UserPlan"("userId", "centerId");

-- CreateIndex
CREATE INDEX "UserPlan_centerId_idx" ON "UserPlan"("centerId");

-- CreateIndex
CREATE INDEX "UserPlan_status_idx" ON "UserPlan"("status");

-- CreateIndex
CREATE INDEX "ManualPayment_centerId_idx" ON "ManualPayment"("centerId");

-- CreateIndex
CREATE INDEX "ManualPayment_userId_idx" ON "ManualPayment"("userId");

-- CreateIndex
CREATE INDEX "ManualPayment_userPlanId_idx" ON "ManualPayment"("userPlanId");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_liveClassId_idx" ON "Reservation"("liveClassId");

-- CreateIndex
CREATE INDEX "Reservation_userPlanId_idx" ON "Reservation"("userPlanId");

-- CreateIndex
CREATE INDEX "Reservation_userId_updatedAt_idx" ON "Reservation"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_userId_liveClassId_key" ON "Reservation"("userId", "liveClassId");

-- CreateIndex
CREATE INDEX "UserCenterRole_userId_idx" ON "UserCenterRole"("userId");

-- CreateIndex
CREATE INDEX "UserCenterRole_centerId_idx" ON "UserCenterRole"("centerId");

-- CreateIndex
CREATE INDEX "UserCenterRole_centerId_role_idx" ON "UserCenterRole"("centerId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "UserCenterRole_userId_centerId_key" ON "UserCenterRole"("userId", "centerId");

-- CreateIndex
CREATE UNIQUE INDEX "CenterMercadoPagoConfig_centerId_key" ON "CenterMercadoPagoConfig"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "CenterZoomConfig_centerId_key" ON "CenterZoomConfig"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "CenterGoogleMeetConfig_centerId_key" ON "CenterGoogleMeetConfig"("centerId");

-- CreateIndex
CREATE INDEX "Plan_centerId_idx" ON "Plan"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_centerId_slug_key" ON "Plan"("centerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Order_externalReference_key" ON "Order"("externalReference");

-- CreateIndex
CREATE INDEX "Order_centerId_idx" ON "Order"("centerId");

-- CreateIndex
CREATE INDEX "Order_centerId_createdAt_idx" ON "Order"("centerId", "createdAt");

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
ALTER TABLE "Discipline" ADD CONSTRAINT "Discipline_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveClassSeries" ADD CONSTRAINT "LiveClassSeries_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveClassSeries" ADD CONSTRAINT "LiveClassSeries_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "LiveClassSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterHoliday" ADD CONSTRAINT "CenterHoliday_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_userPlanId_fkey" FOREIGN KEY ("userPlanId") REFERENCES "UserPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "LiveClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userPlanId_fkey" FOREIGN KEY ("userPlanId") REFERENCES "UserPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCenterRole" ADD CONSTRAINT "UserCenterRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCenterRole" ADD CONSTRAINT "UserCenterRole_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterMercadoPagoConfig" ADD CONSTRAINT "CenterMercadoPagoConfig_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterZoomConfig" ADD CONSTRAINT "CenterZoomConfig_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterGoogleMeetConfig" ADD CONSTRAINT "CenterGoogleMeetConfig_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

