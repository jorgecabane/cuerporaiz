-- Lista de espera (waitlist) para clases en vivo y eventos.
-- Modelo polimórfico: exactamente uno de liveClassId o eventId está seteado
-- (validación en lib/domain/waitlist.ts).

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('QUEUED', 'NOTIFIED', 'HELD', 'PROMOTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "liveClassId" TEXT,
    "eventId" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'QUEUED',
    "position" INTEGER NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "heldUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_userId_liveClassId_key" ON "WaitlistEntry"("userId", "liveClassId");
CREATE UNIQUE INDEX "WaitlistEntry_userId_eventId_key" ON "WaitlistEntry"("userId", "eventId");
CREATE INDEX "WaitlistEntry_liveClassId_status_idx" ON "WaitlistEntry"("liveClassId", "status");
CREATE INDEX "WaitlistEntry_eventId_status_idx" ON "WaitlistEntry"("eventId", "status");
CREATE INDEX "WaitlistEntry_centerId_idx" ON "WaitlistEntry"("centerId");
CREATE INDEX "WaitlistEntry_userId_idx" ON "WaitlistEntry"("userId");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "LiveClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
