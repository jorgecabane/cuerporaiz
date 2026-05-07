-- Add LATE_CANCELLED to ReservationStatus enum.
-- Esta variante existe en schema.prisma desde hace tiempo y la usa
-- `cancelReservationUseCase` cuando la cancelación llega < cancelBeforeMinutes,
-- pero faltaba la migración correspondiente y producía un 500 en producción.
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'LATE_CANCELLED';
