-- Políticas de tiempo del centro en minutos (granularidad para cancelación / ventana de reserva)
ALTER TABLE "Center" ADD COLUMN "cancelBeforeMinutes" INTEGER NOT NULL DEFAULT 720;
ALTER TABLE "Center" ADD COLUMN "bookBeforeMinutes" INTEGER NOT NULL DEFAULT 1440;

UPDATE "Center" SET
  "cancelBeforeMinutes" = COALESCE("cancelBeforeHours", 12) * 60,
  "bookBeforeMinutes" = COALESCE("bookBeforeHours", 24) * 60;

ALTER TABLE "Center" DROP COLUMN "cancelBeforeHours";
ALTER TABLE "Center" DROP COLUMN "bookBeforeHours";
