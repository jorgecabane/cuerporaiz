-- Días antes del vencimiento para avisar "vence pronto" (pantalla y correo).
ALTER TABLE "Center" ADD COLUMN "planExpiringNoticeDays" INTEGER NOT NULL DEFAULT 7;
