-- Rename del flag de clase para reflejar la semántica real:
-- "esta clase acepta reservas de prueba" (no "toda reserva en esta clase es trial").
-- Una clase puede aceptar trials Y tener alumnos con plan en simultáneo.
ALTER TABLE "LiveClass"       RENAME COLUMN "isTrialClass" TO "acceptsTrialReservations";
ALTER TABLE "LiveClassSeries" RENAME COLUMN "isTrialClass" TO "acceptsTrialReservations";

-- Flag explícito en la reserva: marca cuándo el usuario consumió su cupo trial.
-- Antes se inferia por userPlanId IS NULL, lo que generaba falsos positivos.
ALTER TABLE "Reservation" ADD COLUMN "isTrial" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: las reservas históricas sin plan en clases que aceptan trials eran trials.
-- Solo marcamos status que cuentan para "ya usaste tu trial" (mismo criterio que
-- hasTrialReservation): CANCELLED no aplica (libera la trial).
UPDATE "Reservation" r
SET "isTrial" = true
FROM "LiveClass" lc
WHERE r."liveClassId" = lc.id
  AND r."userPlanId" IS NULL
  AND lc."acceptsTrialReservations" = true
  AND r.status IN ('CONFIRMED', 'ATTENDED', 'LATE_CANCELLED', 'NO_SHOW');

-- Índice para que hasTrialReservation() sea barato.
CREATE INDEX "Reservation_userId_isTrial_idx" ON "Reservation"("userId", "isTrial");
