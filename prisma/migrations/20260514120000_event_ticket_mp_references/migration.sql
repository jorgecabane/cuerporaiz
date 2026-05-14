-- AlterTable: agrega referencias MP al EventTicket para que el webhook pueda
-- mapear payment → ticket y para soportar re-compra ("agregar más cupos").
ALTER TABLE "EventTicket"
  ADD COLUMN "externalReference" TEXT,
  ADD COLUMN "pendingAdditionQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pendingAdditionExternalReference" TEXT;

-- Postgres permite múltiples NULL en UNIQUE INDEX (NULL distinct), por lo que
-- estos índices funcionan como unique-when-present sin necesidad de WHERE.
CREATE UNIQUE INDEX "EventTicket_externalReference_key"
  ON "EventTicket"("externalReference");
CREATE UNIQUE INDEX "EventTicket_pendingAdditionExternalReference_key"
  ON "EventTicket"("pendingAdditionExternalReference");
