
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MERCADOPAGO', 'TRANSFER');

-- AlterTable
ALTER TABLE "Center" ADD COLUMN     "bankTransferAcceptEvents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bankTransferAcceptPlans" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bankTransferRequireReceipt" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ManualPayment" ADD COLUMN     "eventTicketId" TEXT,
ADD COLUMN     "receiptSanityId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'MERCADOPAGO',
ADD COLUMN     "transferClaimedAt" TIMESTAMP(3),
ADD COLUMN     "transferReceiptSanityId" TEXT,
ADD COLUMN     "transferRejectedReason" TEXT;

-- AlterTable
ALTER TABLE "EventTicket" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'MERCADOPAGO',
ADD COLUMN     "transferClaimedAt" TIMESTAMP(3),
ADD COLUMN     "transferReceiptSanityId" TEXT,
ADD COLUMN     "transferRejectedReason" TEXT;

-- CreateIndex
CREATE INDEX "ManualPayment_eventTicketId_idx" ON "ManualPayment"("eventTicketId");

-- CreateIndex
CREATE INDEX "Order_centerId_paymentMethod_status_idx" ON "Order"("centerId", "paymentMethod", "status");

-- CreateIndex
CREATE INDEX "EventTicket_paymentMethod_status_idx" ON "EventTicket"("paymentMethod", "status");

-- AddForeignKey
ALTER TABLE "ManualPayment" ADD CONSTRAINT "ManualPayment_eventTicketId_fkey" FOREIGN KEY ("eventTicketId") REFERENCES "EventTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

