/**
 * Backfill: agrega las secciones "playlist" (oculta hasta que la Trini pegue el
 * link de Spotify) y "newsletter" (visible) al centro por defecto.
 *
 * Idempotente — no toca secciones que ya existen.
 * - "newsletter" va justo antes de "cta".
 * - "playlist" va justo después de "on-demand" (Biblioteca), oculta.
 * Run with: npx tsx prisma/scripts/add-playlist-newsletter-sections.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const slug = process.env.NEXT_PUBLIC_DEFAULT_CENTER_SLUG;
if (!connectionString || !slug) {
  console.error("DATABASE_URL and NEXT_PUBLIC_DEFAULT_CENTER_SLUG are required.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function sortOrderOf(centerId: string, sectionKey: string) {
  const s = await prisma.centerSiteSection.findUnique({
    where: { centerId_sectionKey: { centerId, sectionKey } },
    select: { sortOrder: true },
  });
  return s?.sortOrder ?? null;
}

async function insertAt(
  centerId: string,
  data: { sectionKey: string; sortOrder: number; title: string; subtitle: string; visible: boolean }
) {
  await prisma.centerSiteSection.updateMany({
    where: { centerId, sortOrder: { gte: data.sortOrder } },
    data: { sortOrder: { increment: 1 } },
  });
  await prisma.centerSiteSection.create({ data: { centerId, ...data } });
}

async function lastSortOrder(centerId: string) {
  const last = await prisma.centerSiteSection.findFirst({
    where: { centerId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return last?.sortOrder ?? -1;
}

async function main() {
  const center = await prisma.center.findUniqueOrThrow({ where: { slug }, select: { id: true, name: true } });

  if ((await sortOrderOf(center.id, "newsletter")) === null) {
    const at = (await sortOrderOf(center.id, "cta")) ?? (await lastSortOrder(center.id)) + 1;
    await insertAt(center.id, { sectionKey: "newsletter", sortOrder: at, title: "Lo nuevo del blog, en tu correo", subtitle: "Novedades", visible: true });
    console.log(`[+] ${center.name}: "newsletter" en sortOrder ${at}`);
  } else {
    console.log(`[=] ${center.name}: "newsletter" ya existe`);
  }

  if ((await sortOrderOf(center.id, "playlist")) === null) {
    const onDemand = await sortOrderOf(center.id, "on-demand");
    const at = onDemand !== null ? onDemand + 1 : (await lastSortOrder(center.id)) + 1;
    await insertAt(center.id, { sectionKey: "playlist", sortOrder: at, title: "Escucha nuestra playlist", subtitle: "Para practicar en casa", visible: false });
    console.log(`[+] ${center.name}: "playlist" (oculta) en sortOrder ${at}`);
  } else {
    console.log(`[=] ${center.name}: "playlist" ya existe`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
