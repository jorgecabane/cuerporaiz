-- Rename Role enum values from Spanish to English.
-- Idempotent: only runs if DB still has Spanish values (e.g. after init).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'ADMINISTRADORA'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'ADMINISTRADORA' TO 'ADMINISTRATOR';
    ALTER TYPE "Role" RENAME VALUE 'PROFESORA' TO 'INSTRUCTOR';
    ALTER TYPE "Role" RENAME VALUE 'ALUMNA' TO 'STUDENT';
  END IF;
END $$;
