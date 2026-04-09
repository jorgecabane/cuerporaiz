-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventTicketStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "imageUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "maxCapacity" INTEGER,
    "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTicket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "status" "EventTicketStatus" NOT NULL DEFAULT 'PENDING',
    "mpPaymentId" TEXT,
    "orderId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_centerId_idx" ON "Event"("centerId");
CREATE INDEX "Event_centerId_startsAt_idx" ON "Event"("centerId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_eventId_userId_key" ON "EventTicket"("eventId", "userId");
CREATE INDEX "EventTicket_eventId_idx" ON "EventTicket"("eventId");
CREATE INDEX "EventTicket_userId_idx" ON "EventTicket"("userId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventTicket" ADD CONSTRAINT "EventTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
