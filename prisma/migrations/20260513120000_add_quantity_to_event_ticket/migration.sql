-- AlterTable: soporta compra de múltiples cupos por ticket.
-- Default 1 mantiene compat con tickets existentes (un cupo cada uno).
ALTER TABLE "EventTicket" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
