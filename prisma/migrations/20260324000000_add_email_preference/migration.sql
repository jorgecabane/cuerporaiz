-- CreateTable
CREATE TABLE "EmailPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "classReminder" BOOLEAN NOT NULL DEFAULT true,
    "spotFreed" BOOLEAN NOT NULL DEFAULT true,
    "planExpiring" BOOLEAN NOT NULL DEFAULT true,
    "reservationConfirm" BOOLEAN NOT NULL DEFAULT true,
    "purchaseConfirm" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreference_userId_centerId_key" ON "EmailPreference"("userId", "centerId");

-- CreateIndex
CREATE INDEX "EmailPreference_userId_idx" ON "EmailPreference"("userId");

-- CreateIndex
CREATE INDEX "EmailPreference_centerId_idx" ON "EmailPreference"("centerId");

-- AddForeignKey
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
