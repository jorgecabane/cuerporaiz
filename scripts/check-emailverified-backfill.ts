/**
 * Pre-flight check para el backfill de emailVerifiedAt.
 *
 * Reporta cuántos usuarios actuales quedarían marcados como verificados por la
 * migration (passwordHash <> '' y emailVerifiedAt IS NULL) vs cuántos quedan
 * sin tocar (invitados con passwordHash="" que todavía no setearon password —
 * esos siguen su propio flow de set-password).
 *
 * Correr antes y después de aplicar la migration para verificar.
 */
import { prisma } from "@/lib/adapters/db/prisma";

async function main() {
  const totalUsers = await prisma.user.count();
  const verified = await prisma.user.count({ where: { emailVerifiedAt: { not: null } } });
  const toBackfill = await prisma.user.count({
    where: { emailVerifiedAt: null, passwordHash: { not: "" } },
  });
  const pendingInvites = await prisma.user.count({
    where: { emailVerifiedAt: null, passwordHash: "" },
  });
  const withGoogle = await prisma.user.count({ where: { googleId: { not: null } } });

  console.log("--- emailVerifiedAt backfill pre-check ---");
  console.log(`Total users:           ${totalUsers}`);
  console.log(`Ya verified:           ${verified}`);
  console.log(`To backfill (grandfather): ${toBackfill}`);
  console.log(`Pending invites (skip):    ${pendingInvites}`);
  console.log(`Con googleId vinculado:    ${withGoogle}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
