-- Idempotencia para el cron de class-reminder.
-- En Vercel Hobby los crons tienen precisión ±59min, así que el handler puede
-- dispararse en cualquier momento de su ventana horaria. Marcando reservation.reminderSentAt
-- evitamos duplicados aunque dos ejecuciones se solapen.
ALTER TABLE "Reservation" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
