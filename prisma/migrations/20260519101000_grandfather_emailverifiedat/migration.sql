-- Grandfather a los usuarios actuales como "verificados" para no romper sus
-- logins cuando se aplique el gate de emailVerifiedAt en authorize().
--
-- Criterio: marcar todo User con passwordHash <> '' (los que ya pueden loguear
-- hoy). Los invitados pending (passwordHash = '') no se tocan: siguen su flow
-- de set-password, que dispara la verificación al setear contraseña.
UPDATE "User"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", "createdAt")
WHERE "emailVerifiedAt" IS NULL
  AND "passwordHash" <> '';
