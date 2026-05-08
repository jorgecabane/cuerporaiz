-- Add Center.timezone for per-center date formatting in emails / UI.
-- Default America/Santiago since all centers are currently in Chile.
ALTER TABLE "Center" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Santiago';
