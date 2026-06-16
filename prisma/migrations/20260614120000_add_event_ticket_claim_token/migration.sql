-- AlterTable
ALTER TABLE "EventTicket" ADD COLUMN     "claimToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EventTicket_claimToken_key" ON "EventTicket"("claimToken");
